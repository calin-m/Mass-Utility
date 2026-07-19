<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Project Mass Admin - Secure Installer</title>
    <link rel="stylesheet" href="views/css/admin.css">
    <style>
        .pm-login-container {
            width: 380px;
            margin: 8% auto;
        }
        .pm-installer-card {
            border-top: 4px solid var(--pm-warning);
        }
        .pm-installer-title {
            text-align: center;
            margin-bottom: 1.5rem;
        }
        .pm-error-alert {
            background-color: rgba(239, 68, 68, 0.1);
            border: 1px solid var(--pm-danger);
            color: var(--pm-danger);
            border-radius: 4px;
            padding: 0.75rem;
            margin-bottom: 1.5rem;
            font-size: 0.85rem;
        }
        .pm-requirements {
            font-size: 0.75rem;
            color: var(--pm-text-secondary);
            margin-top: 0.25rem;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="pm-login-container">
        <div class="pm-card pm-installer-card">
            <h2 class="pm-installer-title">🛠️ Project Mass Setup</h2>
            <p style="font-size: 0.85rem; color: var(--pm-text-secondary); text-align: center; margin-top: -1rem; margin-bottom: 1.5rem;">
                No administrative account detected. Please initialize your secure Super-Admin credentials.
            </p>

            <?php if (isset($error)): ?>
                <div class="pm-error-alert">
                    <?= htmlspecialchars($error) ?>
                </div>
            <?php endif; ?>

            <form action="index.php?action=setup" method="POST">
                <div class="pm-mb-4">
                    <label class="pm-label">Super-Admin Username</label>
                    <input type="text" name="username" class="pm-input" style="width: 100%;" placeholder="e.g. admin" required autocomplete="username">
                </div>

                <div class="pm-mb-4">
                    <label class="pm-label">Set Password</label>
                    <input type="password" name="password" class="pm-input" style="width: 100%;" required autocomplete="new-password">
                    <div class="pm-requirements">Password must be at least 8 characters long.</div>
                </div>

                <button type="submit" class="pm-btn pm-btn-primary" style="width: 100%;">Initialize & Install Portal</button>
            </form>
        </div>
    </div>
</body>
</html>
