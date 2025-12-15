# Field Qualified Attribution Analysis

## Requirements

### Optimal Validation Requirements
- **Exactly one** businessDataOwner (will be renamed to dataOwner)
- **At least one** dataSteward
- The app should support both `businessDataOwner` and `dataOwner` field names for:
  - Display (Dataset.ts)
  - Validation (dynamic schema loading)

## Current Implementation Status

### ✅ What's Already Implemented

#### Schema Level (dataset.json)
- `minItems: 1` - At least one person required
- `contains` constraint requiring at least one `businessDataOwner`
- TypeScript model defines `prov:qualifiedAttribution` field as an array (dataset.ts:70-85)
- Role enum supports: `businessDataOwner`, `dataSteward`, `dataCustodian`

### ❌ What's Missing

#### Validation Gaps
1. **No validation for exactly one businessDataOwner** - Schema only ensures at least one exists
2. **No validation for at least one dataSteward** - This requirement is not enforced
3. **No support for `dataOwner` field name** - Only `businessDataOwner` is recognized
4. **Schema parser doesn't handle complex array validations** - The `schema-parser.util.ts` doesn't parse the `contains` constraint or complex array validations for `prov:qualifiedAttribution`

#### Downstream Component Issues
1. **Dataset.ts Type**: Currently fixed to `'businessDataOwner'` - won't accept `'dataOwner'`
2. **Component hardcoding**: Role dropdown hardcoded to `businessDataOwner` in `affiliated-persons-field.component.ts:53-57`
3. **Translation keys**: Only `businessDataOwner` exists, no `dataOwner` key
4. **Display logic**: Direct translation lookup won't handle dynamic field names
5. **No custom validation** in `affiliated-persons-field.component.ts` - only basic field-level validators (required, email)

### Display Path
- **Details component** (details.component.html:68): Uses translation key `"choices.dataset.hadRole." + person["dcat:hadRole"]`
- **Translation files**: Have hardcoded keys for `businessDataOwner` only

## How New Schema Fields Are Handled

### Display (Details Page) ✅ Automatic
- `DatasetMetadataService` parses ALL fields from `dataset.json` automatically
- Fields are displayed unless explicitly excluded in `shouldDisplayInDetails()`
- The display logic uses dynamic field discovery from the schema
- New fields appear as text fields with automatic label translation (`labels.${key}`)

### Form (Modify Page) ❌ Manual Configuration Required
- `SchemaToFormlyService` has a **hardcoded field mapping** (schema-to-formly.service.ts:26-44)
- Only fields explicitly listed in `fieldTypeMap` get proper form fields
- Fields are organized into **predefined sections** (lines 305-331)
- New fields not in these mappings are ignored

### Example
If you added `"bv:newField": {"type": "string"}` to dataset.json:
- ✅ **Details page**: Would show automatically with label "labels.bv:newField"
- ❌ **Form**: Would be ignored unless manually configured

## Requirements for Dynamic Form Generation

### Current Blockers

1. **Hardcoded HTML Template** (modify.component.html)
   - Every field is explicitly defined in the template
   - Each field uses specific components
   - Steps are manually organized with specific fields

2. **Hardcoded Step Organization** (dataset-metadata.service.ts:45-105)
   - Steps have predefined field arrays
   - New fields won't appear unless added to a step

3. **Limited Field Type Detection** (modify.component.ts:230-256)
   - Special cases hardcoded for specific fields
   - Default fallback is just a basic FormControl

4. **Component Type Mapping**
   - No dynamic component selection based on field type
   - Template must know which component to use

### Required Changes for Full Dynamic Generation

#### 1. Dynamic Component Rendering
Create a field component mapper that maps field types to Angular components:
```typescript
const FIELD_COMPONENT_MAP = {
  'multilingual': MultilingualTextFieldComponent,
  'enum': EnumSelectFieldComponent,
  'array': KeywordArrayFieldComponent,
  'date': DateFieldComponent,
  'boolean': CheckboxFieldComponent,
  'text': TextFieldComponent, // default
}
```

#### 2. Generic Field Renderer Component
Create a component that dynamically renders the correct field type based on metadata.

#### 3. Template-Driven Field Generation
Replace hardcoded fields with dynamic iteration over field metadata.

#### 4. Enhanced Field Type Detection
Implement intelligent detection based on:
- Property structure (e.g., multilingual if has de/fr/it/en properties)
- Property type and format
- Field naming patterns
- Schema enum presence

#### 5. Auto-Step Assignment
Rule-based assignment of fields to form steps based on field names or metadata.

#### 6. Schema-Driven Enum Options
Extract enum options directly from the schema definition.

### Minimal Changes for Basic Support

For basic text field support of new fields:
1. Modify `buildFormFromMetadata()` to include ALL schema fields
2. Update template to have a catch-all section for unknown fields
3. Ensure steps include an "Additional Fields" section

## Action Items

### High Priority (Required for businessDataOwner/dataOwner support)
1. [ ] Update Dataset.ts Role type to accept both `businessDataOwner` and `dataOwner`
2. [ ] Add translation fallback logic for role display
3. [ ] Implement custom validator for exactly one businessDataOwner/dataOwner
4. [ ] Implement custom validator for at least one dataSteward
5. [ ] Update schema parser to handle complex array validations

### Medium Priority (Improve flexibility)
1. [ ] Make affiliated-persons component handle dynamic role values
2. [ ] Add dataOwner translation keys (or implement fallback)
3. [ ] Update display templates to handle role name variations

### Low Priority (Full dynamic form support)
1. [ ] Implement dynamic component rendering system
2. [ ] Create generic field renderer component
3. [ ] Implement auto-step assignment logic
4. [ ] Create comprehensive field type detection

## Technical Details

### Files Involved

#### Core Schema & Models
- `/src/app/models/schemas/dataset.json` - JSON schema definition
- `/src/app/models/schemas/dataset.ts` - TypeScript types (line 95: Role type)

#### Validation
- `/src/app/services/validation/validation-schema.service.ts` - Schema validation service
- `/src/app/services/validation/schema-parser.util.ts` - Schema parsing utility

#### Form Components
- `/src/app/modify/form/components/affiliated-persons-field/` - Affiliated persons field component
- `/src/app/modify/modify.component.ts` - Main form component
- `/src/app/services/formly/schema-to-formly.service.ts` - Form field generation

#### Display
- `/src/app/details/details.component.html` - Details page template (line 68)
- `/src/assets/i18n/*.json` - Translation files

#### Metadata Services
- `/src/app/services/metadata/dataset-metadata.service.ts` - Field metadata service

## Notes

- The system was designed with some fields being "special" and requiring custom components
- Full dynamic generation would require significant refactoring but would make the system much more maintainable
- The asymmetry between display (automatic) and form (manual) suggests the display side was designed to be more flexible