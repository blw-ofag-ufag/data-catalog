library(jsonlite)

data = read_json("https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/main/data/dataCatalog.json")[[1]]

assignID = function(i) {
  paste0("D",strrep("0",5-nchar(i)),i)
}

transform = function(x, i) {
  m = x[["metadata"]]
  a = x[["attributes"]]
  
  json_data <- list(
    "schema:image" = unbox(m[["imageURL"]]),
    "dcterms:identifier" = unbox(assignID(i)),
    "dcterms:title" = a[["dcterms:title"]],
    "dcterms:description" = a[["dcterms:description"]],
    "dcterms:accessRights" = unbox(a[["dcterms:accessRights"]]),
    "dcterms:publisher" = unbox(a[["dcterms:publisher"]]),
    "dcat:contactPoint" = a[["dcat:contactPoint"]],
    "dcterms:issued" = unbox(a[["dcterms:issued"]]),
    "dcat:keyword" = a[["dcat:keyword"]],
    "dcterms:accrualPeriodicity" = unbox(a[["dcterms:accrualPeriodicity"]]),
    "dcterms:modified" = unbox(a[["dcterms:modified"]]),
    "adms:status" = a[["adms:status"]],
    "bv:classification" = a[["bv:classification"]],
    "bv:personalData" = a[["bv:personalData"]],
    "bv:typeOfData" = a[["bv:typeOfData"]],
    "bv:archivalValue" = a[["bv:archivalValue"]],
    "dcat:themeTaxonomy" = a[["dcat:themeTaxonomy"]],
    "dcat:landingPage" = a[["dcat:landingPage"]],
    "dcterms:spatial" = a[["dcterms:spatial"]],
    "dcterms:temporal" = a[["dcterms:temporal"]],
    "dpv:hasLegalBasis" = a[["bv:legalBasis"]],
    "bv:retentionPeriod" = a[["bv:retentionPeriod"]],
    "bv:itSystem" = a[["bv:itSystem"]],
    "dcat:distribution" = lapply(a[["dcat:distribution"]], function(z) z[["attributes"]])
  )
  
  json_data <- Filter(Negate(is.null), json_data)
  if ("schema:OrganizationRole" %in% names(json_data)) {
    json_data[["schema:OrganizationRole"]] <- Filter(Negate(is.null), json_data[["schema:OrganizationRole"]])
    if (length(json_data[["schema:OrganizationRole"]]) == 0) {
      json_data[["schema:OrganizationRole"]] <- NULL
    }
  }
  
  jsonlite::toJSON(json_data, pretty = TRUE, auto_unbox = TRUE)
}

transform(data[[3]], 3)

for (i in 1:99) {
  path = paste0("data/datasets/",assignID(i),".json")
  sink(path)
  cat(transform(data[[i]],i))
  sink()
}

