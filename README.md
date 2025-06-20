# NPPES Provider Search

A web-based search interface for the National Plan and Provider Enumeration System (NPPES) database that allows users to find healthcare providers by multiple criteria.

## Features

- **Multi-criteria search** supporting:
  - First Name
  - Last Name
  - State
  - City
  - Zip Code
  - Taxonomy Description (specialty)

- **Provider information display**:
  - Provider Name
  - Complete Address
  - Phone Number
  - Specialties

## API Integration

This application uses the official NPPES API:
```
https://npiregistry.cms.hhs.gov/api/
```

### Search Parameters

The application maps form fields to NPPES API parameters:

| Form Field | API Parameter |
|------------|---------------|
| First Name | `first_name` |
| Last Name | `last_name` |
| State | `state` |
| City | `city` |
| Zip Code | `postal_code` |
| Taxonomy Description | `taxonomy_description` |

