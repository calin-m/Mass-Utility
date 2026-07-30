<?php
// @Arch[update_pass_container]

$pdo = new PDO('mysql:host=pm_mariadb_sandbox;dbname=prestashop', 'root', 'admin');
$stmt = $pdo->prepare("UPDATE ps_employee SET passwd = ? WHERE id_employee = 1");
$hash = '$2y$10$FALF963UV9cEeBvm0jFpkuxP9fLlll5VrXI5MWYyBLdaTUXmS5GYW';
$stmt->execute([$hash]);
echo "PASSWORD_UPDATED_SUCCESSFULLY\n";
