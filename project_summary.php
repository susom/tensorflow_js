<?php
namespace Stanford\TensorFlowJS;
/** @var TensorFlowJS $module */


require_once(__DIR__."/vendor/autoload.php");

$loader = new \Twig_Loader_Filesystem(__DIR__."/templates/");
$twig = new \Twig_Environment($loader);

echo $twig->render("projectSummary.twig", [
        "modelUrl"  => $module->getUrl('model',true,true) . "&pid=" . $module->getProjectId()
    ]
);



include_once("REDCapJsRenderer.php");

$rjr = new REDCapJsRenderer();

$result = REDCapJsRenderer::createHash($module->getProjectId(), $module->getFirstEventId(), "survey");

echo "<pre>";
echo "Made $result \n";


$result2 = REDCapJsRenderer::lookupHash( $result);

echo print_r($result2,true);