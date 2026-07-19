<?php
declare(strict_types=1);
session_start();

require_once dirname(__DIR__) . '/src/Service/AdminSettingsManager.php';
require_once dirname(__DIR__) . '/src/Repository/LicenseRepository.php';
require_once dirname(__DIR__) . '/src/Controller/AdminApiController.php';

$action = $_GET['action'] ?? '';
$auth = new \MassUtilityAdmin\Service\AdminSettingsManager();

// Simple Router
if (!$auth->isAuthenticated() && $action !== 'login') {
    // Render Login page
    require_once dirname(__DIR__) . '/views/templates/login.tpl';
    exit;
}

if ($action === 'login') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    if ($auth->login($username, $password)) {
        header("Location: index.php");
    } else {
        $error = "Invalid credentials";
        require_once dirname(__DIR__) . '/views/templates/login.tpl';
    }
    exit;
}

if ($action === 'logout') {
    $auth->logout();
    header("Location: index.php");
    exit;
}

// API Dispatcher
if (str_starts_with($action, 'api_')) {
    header('Content-Type: application/json');
    $controller = new \MassUtilityAdmin\Controller\AdminApiController($auth);
    $controller->execute($action);
    exit;
}

// Render Dashboard UI
require_once dirname(__DIR__) . '/views/templates/admin_dashboard.tpl';
