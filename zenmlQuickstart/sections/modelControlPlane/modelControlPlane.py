pipeline_settings = {}

# Lets add some metadata to the model to make it identifiable
pipeline_settings["model"] = Model(
    name="breast_cancer_classifier",
    license="Apache 2.0",
    description="A breast cancer classifier",
    tags=["breast_cancer", "classifier"],
)

# Let's train the SGD model and set the version name to "sgd"
pipeline_settings["model"].version = "sgd"

# the `with_options` method allows us to pass in pipeline settings
#  and returns a configured pipeline
training_configured = training.with_options(**pipeline_settings)

# We can now run this as usual
training_configured(
    model_type="sgd",
    train_dataset_id=dataset_trn_artifact_version.id,
    test_dataset_id=dataset_tst_artifact_version.id
)

# Let's train the RF model and set the version name to "rf"
pipeline_settings["model"].version = "rf"

# the `with_options` method allows us to pass in pipeline settings
#  and returns a configured pipeline
training_configured = training.with_options(**pipeline_settings)

# Let's run it again to make sure we have two versions
training_configured(
    model_type="rf",
    train_dataset_id=dataset_trn_artifact_version.id,
    test_dataset_id=dataset_tst_artifact_version.id
)
