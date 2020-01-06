// This is a tensorflow helper object designed to manage all the tensorflow fun!
var RCTF = {

    modelUrl: "/plugins/models/model.json",
    model: {},

    // labels: [],
    labels: ['Cardiomegaly', 'Emphysema', 'Effusion', 'Hernia', 'Infiltration', 'Mass', 'Nodule', 'Atelectasis',
        'Pneumothorax', 'Pleural Thickening', 'Pneumonia', 'Fibrosis', 'Edema', 'Consolidation'
    ],

    labels_to_show: ['Cardiomegaly', 'Emphysema', 'Effusion', 'Hernia', 'Infiltration', 'Mass', 'Nodule', 'Atelectasis',
        'Pneumothorax', 'Pleural Thickening', 'Pneumonia', 'Fibrosis', 'Edema', 'Consolidation'
    ],
    //
    // model: {},

    warmUpModel: function() {
        // var _this = this;
        const warmupResult = this.model.predict(tf.zeros([1, 320, 320, 3]), );
        warmupResult.dataSync();
        tf.dispose(warmupResult);
    },

    loadModel: async function() {
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

    log: function(x) {
        log(x);
    },

    loadModel2: async function() {
        var _this = this;

        // In the following line, you should include the prefixes of implementations you want to test.
        window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        // DON'T use "var indexedDB = ..." if you're not in a function.
        // Moreover, you may need references to some window.IDB* objects:
        window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || {READ_WRITE: "readwrite"}; // This line should only be needed if it is needed to support the object's constants for older browsers
        window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
        // (Mozilla has never prefixed these objects, so we don't need window.mozIDB*)

        if (!window.indexedDB) {
            console.log("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
        }


        function progress_model_load(p) {
            let percent = Math.round(p * 100);
            _this.updateProgress(percent, "Loading Model (" + percent + "%)...");
        }

        _this.startProgress();

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

        // Warmup the model before using real data.
        // _this.updateProgress(100, "Warming up...");
        log('removeProgress');
        _this.stopProgress();

        log('warming up model');
        _this.warmUpModel();

        log('preparingResults');
        _this.prepareResults();


    },


    preprocessImage: function(image) {
        var _this = this;

        return tf.tidy(() => {
            let tensor = tf.browser.fromPixels(image, numChannels = 3);
            const h = tensor.shape[0];
            const w = tensor.shape[1];
            console.log('dimensions are', h, w);
            console.log('tensor', tensor);

            tensor = tensor.slice([0, parseInt(w / 2 - h / 2), 0], [h, h, 3]);
            tensor = tensor.resizeBilinear([320, 320]).toFloat();

            let mean = tf.tensor1d([136.41330078125, 136.41330078125, 136.41330078125]);
            let std = tf.tensor1d([70.48567315394112]);
            let proc_image = tensor.sub(mean).div(std)
                .expandDims(0);
            return proc_image;
        })
    },

    num_predictions: 0,
    prediction_rolling_mean: 0,
    // tensor: 0,

    get_preds: async function(webcam_elemnt, model) {
        var _this = this;

        tensor = _this.preprocessImage(webcam_elemnt);

        var t0 = performance.now();
        let prediction = _this.model.predict(tensor);
        let data = prediction.dataSync();
        var t1 = performance.now();

        var new_mean = (_this.num_predictions * _this.prediction_rolling_mean + t1 - t0) / (_this.num_predictions + 1);
        _this.num_predictions += 1;
        _this.prediction_rolling_mean = new_mean;

        $(".prediction-time").text(`Average Prediction Time: ${Math.round(_this.prediction_rolling_mean)} ms`)

        $("#memory").text(`GPU Memory: ${Math.round(tf.memory()["numBytesInGPU"]/1024/1024)} MB`);


        // Dump result data into REDcap field:
        $('input[name="data"]').val(JSON.stringify(data));

        // Update the results
        for (let i = 0; i < data.length; i++) {
            if (_this.labels_to_show.indexOf(_this.labels[i]) != -1) {
                bar = _this.prediction_elements[i];
                bar.css("width", `${data[i] * 100}%`);
            }
        }

        tf.dispose(prediction);
        tf.dispose(data);
        tf.dispose(tensor);
    },

    readURL: function(input) {
        var _this = this;

        if (input.files && input.files[0]) {
            var reader = new FileReader();
            reader.onload = function(e) {
                console.log("Second");
                // Upon loading file, place results into xray-image
                $('#xray-image').attr('src', e.target.result);

                // Store data in REDCap field
                $('input[name="image_base64"]').val(e.target.result);
            };

            console.log("First");
            reader.readAsDataURL(input.files[0]);
        }
    },

    // Array of jquery objects to hold progress bars for results
    prediction_elements: [],

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

    runModelOnImage: function(image) {
        var _this = this;

        $('.prediction').show();

        // Set bars to zero
        for (let i = 0; i < _this.labels_to_show.length; i++) {
            let bar = _this.prediction_elements[i];
            bar.css("width", `0%`);
        }

        setTimeout(function() {
            _this.get_preds(image, _this.model);
        }, 100);
    },

    bindUpload: function() {
        var _this = this;
        $('#select_file').change(function() {
            console.log("Analyzing...");
            setTimeout(function() {
                // Show the uploaded file
                $('#xray-image').show();

                // Rune model
                _this.runModelOnImage($("#xray-image")[0]);
            }, 100)
        });

        // Capture click on image
        $('.select-xray').click(function() {
            $("#select_file").click();
        });
    },

    startProgress: function() {
        $('#pleaseWaitDialog').modal('show');
    },

    stopProgress: function() {
        $('#pleaseWaitDialog').modal('hide');
    },

    setProgressTitle: function(title) {
        $('#pleaseWaitDialog .modal-header').html("<h3>" + title + "</h3>");
    },

    updateProgress: function(percent, text) {
        $('#pleaseWaitDialog .progress-bar')
            .css("width", percent + '%')
            .attr("aria-valuenow", percent)
            .find('span').html(text);
    }
};

$(document).ready(function(){
    RCTF.loadModel2();
    RCTF.bindUpload();
});

