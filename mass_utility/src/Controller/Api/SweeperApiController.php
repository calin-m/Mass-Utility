<?php
declare(strict_types=1);

namespace MassUtility\Controller\Api;

use MassUtility\Service\MaintenanceSweeperEngine;
use Tools;

require_once __DIR__ . '/AbstractApiController.php';

/**
 * Handles Maintenance Sweeper endpoints
 */
class SweeperApiController extends AbstractApiController
{
    private MaintenanceSweeperEngine $sweeper;

    public function __construct(MaintenanceSweeperEngine $sweeper)
    {
        $this->sweeper = $sweeper;
    }

    protected function sweepCarts(): void
    {
        $daysOld = (int)Tools::getValue('days_old', 90);
        $chunkSize = (int)Tools::getValue('chunk_size', 5000);
        $result = $this->sweeper->sweepAbandonedCarts($daysOld, $chunkSize);
        
        if ($result['success']) {
            $this->sendJsonResponse($result);
        } else {
            $this->sendErrorResponse($result['error']);
        }
    }

    protected function warmIndex(): void
    {
        $chunkSize = (int)Tools::getValue('chunk_size', 500);
        $result = $this->sweeper->warmSearchIndex($chunkSize);
        
        if ($result['success']) {
            $this->sendJsonResponse($result);
        } else {
            $this->sendErrorResponse($result['error']);
        }
    }

    protected function purgeGhostImages(): void
    {
        $chunkSize = (int)Tools::getValue('chunk_size', 1000);
        $result = $this->sweeper->purgeGhostImages($chunkSize);
        
        if ($result['success']) {
            $this->sendJsonResponse($result);
        } else {
            $this->sendErrorResponse($result['error']);
        }
    }

    protected function sweeperAnalyze(): void
    {
        $daysOld = (int)Tools::getValue('days_old', 30);
        $result = $this->sweeper->analyzeData($daysOld);
        if ($result['success']) {
            $this->sendJsonResponse($result);
        } else {
            $this->sendErrorResponse($result['error']);
        }
    }

    protected function sweeperSweepConnections(): void
    {
        $daysOld = (int)Tools::getValue('days_old', 30);
        $chunkSize = (int)Tools::getValue('chunk_size', 5000);
        $result = $this->sweeper->sweepConnectionsChunk($daysOld, $chunkSize);
        if ($result['success']) {
            $this->sendJsonResponse($result);
        } else {
            $this->sendErrorResponse($result['error']);
        }
    }

    protected function sweeperSweepGuests(): void
    {
        $chunkSize = (int)Tools::getValue('chunk_size', 5000);
        $result = $this->sweeper->sweepGuestsChunk($chunkSize);
        if ($result['success']) {
            $this->sendJsonResponse($result);
        } else {
            $this->sendErrorResponse($result['error']);
        }
    }

    protected function sweeperSweepCarts(): void
    {
        $daysOld = (int)Tools::getValue('days_old', 30);
        $chunkSize = (int)Tools::getValue('chunk_size', 5000);
        $result = $this->sweeper->sweepAbandonedCarts($daysOld, $chunkSize);
        if ($result['success']) {
            $this->sendJsonResponse($result);
        } else {
            $this->sendErrorResponse($result['error']);
        }
    }

    protected function sweeperScanImages(): void
    {
        $result = $this->sweeper->scanOrphanedImages();
        if ($result['success']) {
            $this->sendJsonResponse($result);
        } else {
            $this->sendErrorResponse($result['error']);
        }
    }

    protected function sweeperPurgeImages(): void
    {
        $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $files = isset($payload['files']) ? $payload['files'] : [];
        if (!is_array($files)) {
            $this->sendErrorResponse("Invalid file list provided.");
        }
        $result = $this->sweeper->purgeOrphanedImages($files);
        $this->sendJsonResponse($result);
    }
}
