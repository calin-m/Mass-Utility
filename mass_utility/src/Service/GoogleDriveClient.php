<?php
declare(strict_types=1);

if (!defined('_PS_VERSION_')) {
    exit;
}

namespace MassUtility\Service;

use Exception;
use Configuration;

/**
 * Lightweight, dependency-free Google Drive API client using pure PHP curl/streams.
 * Uses the SaaS Dashboard Token Broker pattern to refresh tokens securely without exposing the Client Secret.
 */
class GoogleDriveClient
{
    private Logger $logger;
    private string $saasBrokerUrl;

    public function __construct(Logger $logger)
    {
        $this->logger = $logger;
        // In a production environment, this would point to the live SaaS broker endpoint.
        $this->saasBrokerUrl = defined('PM_SAAS_BROKER_URL') ? PM_SAAS_BROKER_URL : 'https://dashboard.projectmass.com/api/broker.php';
    }

    /**
     * Retrieve a valid access token, renewing it via the SaaS broker if expired.
     */
    public function getAccessToken(): string
    {
        $accessToken = (string)Configuration::get('PM_GD_ACCESS_TOKEN');
        $expiresAt = (int)Configuration::get('PM_GD_EXPIRES_AT');
        $refreshToken = (string)Configuration::get('PM_GD_REFRESH_TOKEN');

        if (empty($accessToken) && empty($refreshToken)) {
            throw new Exception("Google Drive is not authenticated. Please connect your account from the dashboard.");
        }

        if (empty($accessToken) || time() >= ($expiresAt - 60)) {
            if (empty($refreshToken)) {
                throw new Exception("Access token expired and no refresh token available.");
            }
            $accessToken = $this->refreshAccessTokenViaBroker($refreshToken);
        }

        return $accessToken;
    }

    /**
     * Refresh an expired access token using the centralized SaaS Broker.
     */
    private function refreshAccessTokenViaBroker(string $refreshToken): string
    {
        $postData = [
            'action' => 'refresh_google_token',
            'refresh_token' => $refreshToken
        ];

        $ch = curl_init($this->saasBrokerUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For local testing, usually true in production

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            $this->logger->logError("Google token broker refresh failed (HTTP $httpCode): $response");
            throw new Exception("Google token broker refresh failed (HTTP $httpCode)");
        }

        $data = json_decode((string)$response, true);
        if (empty($data['success']) || empty($data['access_token'])) {
            throw new Exception("Google token broker returned invalid payload: $response");
        }

        Configuration::updateValue('PM_GD_ACCESS_TOKEN', $data['access_token']);
        $expiresAt = time() + (int)($data['expires_in'] ?? 3600);
        Configuration::updateValue('PM_GD_EXPIRES_AT', $expiresAt);

        return $data['access_token'];
    }

    /**
     * Get or create a folder in Google Drive.
     */
    public function getOrCreateFolder(string $folderName, ?string $parentId = null): string
    {
        $token = $this->getAccessToken();

        $q = "mimeType = 'application/vnd.google-apps.folder' and name = '" . str_replace("'", "\\'", $folderName) . "' and trashed = false";
        if ($parentId !== null) {
            $q .= " and '" . str_replace("'", "\\'", $parentId) . "' in parents";
        } else {
            $q .= " and 'root' in parents";
        }

        $url = 'https://www.googleapis.com/drive/v3/files?' . http_build_query([
            'q' => $q,
            'spaces' => 'drive',
            'fields' => 'files(id, name)'
        ]);

        $headers = [
            "Authorization: Bearer $token"
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new Exception("Google Drive folder search failed (HTTP $httpCode): $response");
        }

        $data = json_decode((string)$response, true);
        if (!empty($data['files'][0]['id'])) {
            return $data['files'][0]['id'];
        }

        // Folder doesn't exist, create it
        $createHeaders = [
            "Authorization: Bearer $token",
            "Content-Type: application/json; charset=UTF-8"
        ];

        $metadata = [
            'name' => $folderName,
            'mimeType' => 'application/vnd.google-apps.folder'
        ];
        if ($parentId !== null) {
            $metadata['parents'] = [$parentId];
        }

        $ch = curl_init('https://www.googleapis.com/drive/v3/files');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($metadata));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $createHeaders);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 && $httpCode !== 201) {
            throw new Exception("Google Drive folder creation failed (HTTP $httpCode): $response");
        }

        $data = json_decode((string)$response, true);
        if (empty($data['id'])) {
            throw new Exception("Google Drive folder creation returned no ID: $response");
        }

        return $data['id'];
    }

    /**
     * List files inside a specific Google Drive folder.
     */
    public function listFilesInFolder(string $folderId, string $fields = 'files(id,name,md5Checksum,size)'): array
    {
        $token = $this->getAccessToken();
        $q = "'" . str_replace("'", "\\'", $folderId) . "' in parents and trashed = false";
        $url = 'https://www.googleapis.com/drive/v3/files?' . http_build_query([
            'q' => $q,
            'spaces' => 'drive',
            'fields' => $fields
        ]);

        $headers = [
            "Authorization: Bearer $token"
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new Exception("Google Drive folder listing failed (HTTP $httpCode): $response");
        }

        $data = json_decode((string)$response, true);
        return $data['files'] ?? [];
    }

    /**
     * Initiate a resumable upload session.
     */
    public function initiateResumableUpload(string $fileName, int $fileSize, string $mimeType = 'application/octet-stream', ?string $parentId = null): string
    {
        $token = $this->getAccessToken();

        $headers = [
            "Authorization: Bearer $token",
            "Content-Type: application/json; charset=UTF-8",
            "X-Upload-Content-Type: $mimeType",
            "X-Upload-Content-Length: $fileSize"
        ];

        $metadataFields = [
            'name' => $fileName
        ];
        if ($parentId !== null) {
            $metadataFields['parents'] = [$parentId];
        }
        $metadata = json_encode($metadataFields);

        $ch = curl_init('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $metadata);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_HEADER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new Exception("Google Drive upload initiation failed (HTTP $httpCode): $response");
        }

        $uploadUrl = '';
        if (preg_match('/^location:\s*([^\r\n]+)/im', (string)$response, $matches)) {
            $uploadUrl = trim($matches[1]);
        }

        if (empty($uploadUrl)) {
            throw new Exception("Google Drive did not return a resumable upload Location header.");
        }

        return $uploadUrl;
    }

    /**
     * Upload a single chunk to the resumable upload session.
     */
    public function uploadChunk(string $filePath, string $uploadUrl, int $offset, int $chunkSize): array
    {
        if (!file_exists($filePath)) {
            throw new Exception("Local file not found for chunk upload: $filePath");
        }

        $fileSize = filesize($filePath);
        $handle = fopen($filePath, 'rb');
        if (!$handle) {
            throw new Exception("Unable to open local file for chunk reading: $filePath");
        }

        if ($offset > 0) {
            fseek($handle, $offset);
        }

        $chunk = fread($handle, $chunkSize);
        fclose($handle);

        if ($chunk === false) {
            throw new Exception("Failed to read chunk from file at offset $offset.");
        }

        $currentChunkLength = strlen($chunk);
        if ($currentChunkLength === 0) {
            throw new Exception("Read 0 bytes at offset $offset.");
        }

        $rangeStart = $offset;
        $rangeEnd = $offset + $currentChunkLength - 1;
        $token = $this->getAccessToken();

        $uploadHeaders = [
            "Authorization: Bearer $token",
            "Content-Length: $currentChunkLength",
            "Content-Range: bytes $rangeStart-$rangeEnd/$fileSize",
            "Content-Type: application/octet-stream"
        ];

        $ch = curl_init($uploadUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $chunk);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $uploadHeaders);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 && $httpCode !== 201 && $httpCode !== 308) {
            throw new Exception("Google Drive chunk upload failed (HTTP $httpCode): $response");
        }

        $data = json_decode((string)$response, true);
        
        return [
            'status_code' => $httpCode,
            'response' => $data,
            'uploaded_bytes' => $rangeEnd + 1,
            'complete' => ($httpCode === 200 || $httpCode === 201)
        ];
    }

    /**
     * Retrieve metadata for a file on Google Drive (such as size and md5Checksum).
     */
    public function getFileMetadata(string $driveFileId, string $fields = 'id,name,md5Checksum,size'): array
    {
        $token = $this->getAccessToken();
        $url = 'https://www.googleapis.com/drive/v3/files/' . urlencode($driveFileId) . '?' . http_build_query([
            'fields' => $fields
        ]);

        $headers = [
            "Authorization: Bearer $token"
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new Exception("Google Drive file metadata retrieval failed (HTTP $httpCode): $response");
        }

        $data = json_decode((string)$response, true);
        if (empty($data)) {
            throw new Exception("Google Drive metadata returned empty payload.");
        }

        return $data;
    }

    /**
     * Delete a file from Google Drive.
     */
    public function deleteFile(string $driveFileId): void
    {
        $token = $this->getAccessToken();
        $headers = [
            "Authorization: Bearer $token"
        ];

        $ch = curl_init("https://www.googleapis.com/drive/v3/files/" . urlencode($driveFileId));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 204 && $httpCode !== 404) {
            throw new Exception("Google Drive file deletion failed (HTTP $httpCode): $response");
        }
    }

    /**
     * Stream a file from Google Drive directly to the HTTP output buffer.
     */
    public function streamFileToOutput(string $driveFileId, string $fileName, int $fileSize): void
    {
        $token = $this->getAccessToken();
        $url = 'https://www.googleapis.com/drive/v3/files/' . urlencode($driveFileId) . '?alt=media';

        header('Content-Description: File Transfer');
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . basename($fileName) . '"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        if ($fileSize > 0) {
            header('Content-Length: ' . $fileSize);
        }

        // Clean out any output buffers before streaming
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $token"]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        
        // Stream directly to output buffer
        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($ch, $data) {
            echo $data;
            flush();
            return strlen($data);
        });

        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new Exception("Google Drive stream failed (HTTP $httpCode)");
        }
    }

    /**
     * Download a file from Google Drive directly to a local path (memory safe).
     */
    public function downloadFileToLocal(string $driveFileId, string $localPath, ?callable $progressCallback = null): void
    {
        $token = $this->getAccessToken();
        $url = 'https://www.googleapis.com/drive/v3/files/' . urlencode($driveFileId) . '?alt=media';

        $dir = dirname($localPath);
        if (!is_dir($dir)) {
            if (!mkdir($dir, 0755, true) && !is_dir($dir)) {
                throw new Exception("Failed to create destination directory: $dir");
            }
        }

        $outHandle = fopen($localPath, 'wb');
        if (!$outHandle) {
            throw new Exception("Unable to open local path for writing: $localPath");
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $token"]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_FILE, $outHandle);

        if ($progressCallback !== null) {
            curl_setopt($ch, CURLOPT_NOPROGRESS, false);
            curl_setopt($ch, CURLOPT_PROGRESSFUNCTION, function ($ch, $download_size, $downloaded, $upload_size, $uploaded) use ($progressCallback) {
                $progressCallback((int)$download_size, (int)$downloaded);
            });
        }

        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        fclose($outHandle);
        curl_close($ch);

        if (!$res || $httpCode !== 200) {
            if (file_exists($localPath)) {
                @unlink($localPath);
            }
            throw new Exception("Google Drive file download failed (HTTP $httpCode)");
        }
    }
}
