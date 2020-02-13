// This is a tensorflow helper object designed to manage all the tensorflow fun!
var RCTF = {
    model: {},

    // Do we present a button or just analyze after upload...
    autoRunModel: true,

    // Jquery reference to upload element
    uploadInput: {},
    uploadImage: {},

    // METRICS FOR PREDICTION
    prediction_count: 0,
    prediction_rolling_mean: 0,

    prediction_time: null,
    prediction_memory: null,
    prediction_data: null,

    // Array of jquery objects to hold progress bars for results
    prediction_elements: [],

    init: function(emSettings) {
        this.modelUrl   = emSettings["model-url"].value;
        this.labels     = [];

        var temp        = emSettings["expected-variables"].value.split(",");
        for(var i in temp){
            this.labels.push({"feature" : temp[i].trim() , "percentage" : 0});
        }


        var feature_container = $("#prediction-list");
        var feature_template  = $("#template_feature_prediction").html();
        var raw_html          = Mustache.render(feature_template, {"features" : this.labels});
        var row               = $( raw_html );
        row.appendTo(feature_container);
    },

    loadModelOld: async function() {
        var _this = this;

        _this.startProgress();

        function progress_model_load(p) {
            let percent = Math.round(p * 100);
            _this.updateProgress(percent, "Loading Model (" + percent + "%)...");
        }

        this.model = await tf.loadLayersModel(this.modelUrl, { 'onProgress': progress_model_load });

        _this.updateProgress(100, "Warming up...");

        // Warmup the model before using real data.
        _this.warmUpModel();

        _this.prepareResults();

        _this.stopProgress();
    },

    // An attempt to cache the model in local storage
    loadModel: async function(callback) {
        var _this = this;

        // In the following line, you should include the prefixes of implementations you want to test.
        window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        // DON'T use "var indexedDB = ..." if you're not in a function.
        // Moreover, you may need references to some window.IDB* objects:
        window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || {READ_WRITE: "readwrite"}; // This line should only be needed if it is needed to support the object's constants for older browsers
        window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
        // (Mozilla has never prefixed these objects, so we don't need window.mozIDB*)

        if (!window.indexedDB) {
            log("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
        }

        function startProgress() {
            _this.loadingModal.modal('show');
        }

        function progress_model_load(p) {
            let percent = Math.round(p * 100);
            let text = "Loading Model (" + percent + "%)...";

            var pb = _this.loadingModal.find('.progress-bar');
            pb
                .css("width", percent + '%')
                .attr("aria-valuenow", percent)
                .find('span').html(text);

            // updateProgress(percent, "Loading Model (" + percent + "%)...");
        }

        function stopProgress() {
            // log('about to StopProgress');
            _this.loadingModal.modal('hide');

            // For some reason, the modal doesn't always hide the first time so I'm adding a double-checker...
            setTimeout( function() {
                if (_this.loadingModal.hasClass('show')) {
                    log('Found a modal with show class - re-remove modal');
                    _this.loadingModal.modal('hide');
                } else {
                    // log('modal closed cleanly');
                }
            }, 100, _this);
        }

        startProgress();

        try {
            this.model = await tf.loadLayersModel('indexeddb://model', { 'onProgress': progress_model_load });
        } catch (error) {
            log(error);
            // Model is not in local db storage - let's get it online
            log('Getting model from ' + this.modelUrl);
            this.model = await tf.loadLayersModel(this.modelUrl, { 'onProgress': progress_model_load });

            // Save the model to the local db
            const saveResult = await this.model.save('indexeddb://model');
            log("Saved model to local db?", saveResult);
        }
        log('Just loaded a model', this.model);

        stopProgress();

        // Skipping warmup for testing
        // log('warming up model');
        _this.warmUpModel();

        // log('preparingResults');
        // _this.prepareResults();
        if(callback && typeof(callback) === "function"){
            log("Model loaded callback");
            callback.call(_this);
        }
    },

    // Actually apply the model to the image data
    predictImage: async function(image_element, callback) {
        var _this = this;
        log("In predictImage");

        tensor = _this.preprocessImage(image_element);

        var t0          = performance.now();
        let prediction  = _this.model.predict(tensor);
        let data        = prediction.dataSync();
        var t1          = performance.now();

        var new_mean = (_this.prediction_count * _this.prediction_rolling_mean + t1 - t0) / (_this.prediction_count + 1);

        _this.prediction_count += 1;
        _this.prediction_rolling_mean   = new_mean;
        _this.prediction_time           = Math.round(_this.prediction_rolling_mean);                 //ms
        _this.prediction_memory         = Math.round(tf.memory()["numBytesInGPU"]/1024/1024);   //MB
        _this.prediction_data           = data;

        tf.dispose(prediction);
        tf.dispose(data);
        tf.dispose(tensor);

        log("predictImage Complete", data);
        if(callback && typeof(callback) === "function"){
            log("Calling callback");
            callback.call(_this,data);
        }
    },

    // Run a pre-prediction to warm up model and reduce future model time
    warmUpModel: function() {
        // var _this = this;
        const warmupResult = this.model.predict(tf.zeros([1, 320, 320, 3]), );
        warmupResult.dataSync();
        tf.dispose(warmupResult);
    },

    // Prepare image
    preprocessImage: function(image) {
        // var _this = this;
        return tf.tidy(() => {
            let tensor = tf.browser.fromPixels(image, numChannels = 3);
            const h = tensor.shape[0];
            const w = tensor.shape[1];
            log('preprocessingImage to ' + h + 'x' + w);

            tensor = tensor.slice([0, parseInt(w / 2 - h / 2), 0], [h, h, 3]);
            tensor = tensor.resizeBilinear([320, 320]).toFloat();

            let mean = tf.tensor1d([136.41330078125, 136.41330078125, 136.41330078125]);
            let std = tf.tensor1d([70.48567315394112]);

            return tensor.sub(mean).div(std).expandDims(0);
        })
    },

    prepareResults: function() {
        var _this = this;

        // Make a copy of the results template
        let pred_template = $(".prediction-template").clone();
        pred_template.removeAttr("hidden");
        pred_template.removeClass("prediction-template");

        let labels = _this.labels;
        let labels_to_show = _this.labels_to_show;

        for (let i = 0; i < labels.length; i++) {
            let e = pred_template.clone();
            let label = labels[i];
            e.find('.label').text(label);
            $("#prediction-list").append(e);

            _this.prediction_elements.push($(e.find(".progress-bar")));
        }

        // Hide those results that are not set to show
        for (let i = 0; i < labels.length; i++) {
            if (labels_to_show.indexOf(labels[i]) == -1) {
                _this.prediction_elements[i].parent().parent().parent().hide();
            }
        }
    },

    runModelOnImage: function() {
        var _this = this;
        log("Starting runModelOnImage");

        _this.predictImage(_this.uploadImage[0], function() {
            log("Done with runModelOnImage");
            _this.analysisInProgress.hide();
            // $('#tf_analyzing').hide();

            // show some prediction detail data
            $(".prediction_time").text(_this.prediction_time + "ms");
            $(".prediction_memory").text(_this.prediction_memory + "MB");
            $(".prediction_details").addClass("temp_show_remove_on_clear");
            _this.analysisDone.addClass("temp_show_remove_on_clear").fadeIn();

            // update visual graph of prediction percentages by feature
            _this.updateFeaturePredictions(_this.prediction_data);

            // fill in form field for model results - raw json
            var stringify_results = JSON.stringify(_this.prediction_data);
            $("#model_results").val(stringify_results);
            $("#base64_image").val(_this.uploadImage.attr("src"));
        });
    },

    updateFeaturePredictions : function(prediction_list){
        var _this = this;
        for(var i in prediction_list){
            var prediction_perc = prediction_list[i]*100;
            var data_label      = _this.labels[i]["feature"];

            var textclass = "text-dark";
            if(prediction_perc > 85){
                textclass="text-white";
            }
            _this.predictionBarScaledTimeout(i, data_label, prediction_perc, textclass);
        }
    },

    predictionBarScaledTimeout : function(i, data_label,prediction_perc,textclass){
        setTimeout(function(){
            var inline_text = Math.round(prediction_perc)+"%";
            var text_ele = $("<span>").html(inline_text).addClass(textclass).addClass("pr-1");
            $(".progress-bar[data-feature='"+data_label+"']").css("width",inline_text).append(text_ele);
        }, i*220);
    },

    // Bind readURL function to changes in the input
    // TODO: Add error handling
    bindEvents: function() {
        var _this = this;

        // Capture changes to the upload input
        _this.uploadInput.change(function() {
            log("Analyzing Upload Input...", _this.uploadInput);
            // Read the image
            _this.readURL(_this.uploadInput, _this.uploadImage, _this.previewImage);
        });


        // Handle manually triggering an analysis
        _this.analysisBtn.bind('click', function() {
            _this.analysisInProgress.show(0);
            _this.analysisBtn.hide();

            // Run the model after a brief timeout to let changes above take place
            setTimeout( function() {
                _this.runModelOnImage();
            }, 10, _this);

        });
    },

    // Reads the inputs and on completion calls the callback method
    readURL: function(uploadInput, destImage, callback) {
        var _this = this;
        log("File read initiated...");
        let input = uploadInput[0];
        if (input.files && input.files[0]) {
            var reader = new FileReader();

            // Set up finishing function
            reader.onload = function(e) {
                log("reader onLoad event");
                callback.call(_this, e.target.result);
            };

            // Start reading...
            reader.readAsDataURL(input.files[0]);
        } else {
            log("There are no files to read", uploadInput);
        }
    },

    previewImage: function(result) {
        var _this = this;

        log("In previewImage", result);
        _this.uploadImage
            .attr('src', result)
            .show(0);

        // Should we run the model automatically?
        if(_this.autoRunModel) {
            _this.analysisBtn.click();
            // setTimeout( function() {
            //     _this.runModelOnImage();
            // }, 10, _this);
        } else {
            // Show the analyze button
            // Show options for doing analysis
            _this.analysisBtn.show(0);
        }

        // Auto-run model on image with short delay to allow upload image to redraw
        // setTimeout(function() {
        //     _this.runModelOnImage();
        // }, 1, _this);
    }
};

