<?php
namespace Stanford\TensorFlowJS;
/** @var \Stanford\TensorFlowJS\TensorFlowJS $module */

// HANDLE POSTBACKS
if(!empty($_POST['action'])) {
    $action = filter_var($_POST['action'], FILTER_SANITIZE_STRING);

    switch ($action) {
        case "getMetadata":
            global $Proj;
            $response = $Proj->metadata;
            break;

        case "save":
            $response = $module->processSave();
            break;

        default:
            $module->emDebug("$action is not supported");
            http_response_code(400);
            exit();
    }

    header("application/json");
    echo json_encode($response, true);
    exit();
}








// RENDER MAIN PAGE
require_once(__DIR__."/vendor/autoload.php");
$loader = new \Twig_Loader_Filesystem(__DIR__."/templates/");
$twig = new \Twig_Environment($loader);

// Additional javascript sources
$sources = [
    $module->getUrl('js/consolelog.js',true,true),
    $module->getUrl('js/redcapTensorFlowModelHelper.js', true, true),
    $module->getUrl('js/model.js', true, true),
];

$emSettings = $module->getProjectSettings();

$project_id = $module->getProjectId();

$hash = uniqid("RR",true);
$context = [
    'pid' => $project_id,
    'event' => $module->getFirstEventId($project_id),
    'instance' => 1,
    'hash' => $hash
];



echo $twig->render("model.twig", [
        "sources"    => $sources,
        "js_link"    => $module->getUrl('js/functions.js'),
        "emSettings" => json_encode($emSettings),
        "context"    => json_encode($context)
    ]
);
