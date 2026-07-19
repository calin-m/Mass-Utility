<?php
declare(strict_types=1);

namespace MassUtility\Controller\Api;

/**
 * The foundation base class for all API endpoints. Enforces the DRY Controller Mandate.
 */
abstract class AbstractApiController
{
    /**
     * Centralized execution gateway. Uses strict method routing to map 
     * procedural action strings (e.g. 'get_server_status') directly to 
     * isolated class methods (e.g. 'getServerStatus()').
     *
     * @param string $action The action identifier from the client.
     * @return void
     */
    public function execute(string $action): void
    {
        if (empty($action)) {
            $this->sendErrorResponse("Action cannot be empty.");
        }

        // Convert snake_case to camelCase (e.g., 'get_server_status' -> 'getServerStatus')
        $methodName = lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $action))));
        
        try {
            $reflection = new \ReflectionMethod($this, $methodName);
            
            // Strictly enforce that the method must be declared on the child class,
            // not a private method, and not an internal base class method.
            if (!$reflection->isPrivate() && $reflection->getDeclaringClass()->getName() !== self::class && !$reflection->isConstructor()) {
                $this->$methodName();
            } else {
                $this->sendErrorResponse("Action routing failed: method '{$methodName}' is not accessible on " . static::class);
            }
        } catch (\ReflectionException $e) {
            // Method does not exist
            $this->sendErrorResponse("Action routing failed: method '{$methodName}' does not exist on " . static::class);
        } catch (\Throwable $e) {
            // Rule 15: Global Boundary Shield. Never let an exception leak HTML to the client.
            $this->sendErrorResponse($e->getMessage());
        }
    }

    /**
     * Centralized method to send standard JSON responses and terminate execution.
     * Prevents raw duplicate header outputs across controllers.
     *
     * @param array $payload The data payload to convert to JSON.
     * @return void
     */
    protected function sendJsonResponse(array $payload): void
    {
        if (!headers_sent()) {
            header('Content-Type: application/json');
        }
        echo json_encode($payload);
        exit;
    }

    /**
     * Centralized method to handle and format JSON error responses.
     *
     * @param string $message The error message.
     * @return void
     */
    protected function sendErrorResponse(string $message): void
    {
        if (!headers_sent()) {
            header('Content-Type: application/json');
        }
        echo json_encode([
            'success' => false,
            'error' => $message
        ]);
        exit;
    }

    /**
     * Helper method to format seconds into human-readable duration (e.g., 1h 5m 2s)
     *
     * @param int $seconds
     * @return string
     */
    protected function formatDuration(int $seconds): string
    {
        if ($seconds < 60) {
            return $seconds . 's';
        }

        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $remainingSeconds = $seconds % 60;

        $parts = [];
        if ($hours > 0) {
            $parts[] = $hours . 'h';
        }
        if ($minutes > 0) {
            $parts[] = $minutes . 'm';
        }
        if ($remainingSeconds > 0 || empty($parts)) {
            $parts[] = $remainingSeconds . 's';
        }

        return implode(' ', $parts);
    }
}
