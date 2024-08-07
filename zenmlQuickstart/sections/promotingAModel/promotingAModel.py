from zenml.client import Client

client = Client()

# Let's load the RF version
rf_zenml_model_version = client.get_model_version("breast_cancer_classifier", "rf")

print("Loading Random Forest classifier model...")
# We can now load our classifier directly as well
random_forest_classifier = rf_zenml_model_version.get_artifact(
    "sklearn_classifier"
).load()

# set the random forest classifier to production
rf_zenml_model_version.set_stage("production", force=True)
print("Random Forest model set to production!")
