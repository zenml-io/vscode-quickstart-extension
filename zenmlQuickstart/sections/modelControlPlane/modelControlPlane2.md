# Using the Model Control Plane 👷‍♂️

This time, running both pipelines has created two associated **model versions**.

The interesting part is that ZenML went ahead and linked all artifacts produced by the
pipelines to that model version, including the two pickle files that represent our
SGD and RandomForest classifier. We can see all artifacts directly from the model
version object:

```python
# Let's load the RF version
rf_zenml_model_version = client.get_model_version("breast_cancer_classifier", "rf")

# We can now load our classifier directly as well
random_forest_classifier = rf_zenml_model_version.get_artifact("sklearn_classifier").load()
```
