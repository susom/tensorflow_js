<?php
namespace Stanford\TensorFlowJS;
/** @var TensorFlowJS $module */


require_once(__DIR__."/vendor/autoload.php");

$loader = new \Twig_Loader_Filesystem(__DIR__."/templates/");
$twig = new \Twig_Environment($loader);

if ($_POST) {
    $module->generateTemplateFromPost($twig);
}
else {
    echo $twig->render("bootstrapMaterialDesign.twig", [
            "js_link" => $module->getUrl('js/functions.js')
        ]
    );
}