<?php
require_once __DIR__ . "/models/AdminUserModel.php";
$model = new AdminUserModel();
$users = $model->getAllUsers('', '', 10, 0);
echo json_encode($users);
