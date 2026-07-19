<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Project Mass Admin - Login</title>
    <link rel="stylesheet" href="css/admin.css">
    <style>
        .pm-login-container {
            width: 380px;
            margin: 10% auto;
            border: 1px solid var(--pm-border-color);
            background-color: var(--pm-bg-card);
            padding: 2.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
    </style>
</head>
<body style="background-color: var(--pm-bg-main);">
    <div class="pm-login-container">
        <h2 style="text-align: center; margin-bottom: 1.5rem;">🔐 Admin Login</h2>
        <?php if (isset($error)): ?>
        <p style="color: var(--pm-danger); font-size: 0.9rem; text-align: center; font-weight: 600;"><?= htmlspecialchars($error) ?></p>
        <?php endif; ?>
        <form action="index.php?action=login" method="POST">
            <div class="pm-mb-4">
                <label class="pm-label">Username</label>
                <input type="text" name="username" class="pm-input" style="width: 100%; box-sizing: border-box;" required autocomplete="username">
            </div>
            <div class="pm-mb-6">
                <label class="pm-label">Password</label>
                <input type="password" name="password" class="pm-input" style="width: 100%; box-sizing: border-box;" required autocomplete="current-password">
            </div>
            <button type="submit" class="pm-btn pm-btn-primary" style="width: 100%;">Access Portal</button>
        </form>
    </div>
</body>
</html>
