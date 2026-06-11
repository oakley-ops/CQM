// AUTO-GENERATED — do not edit by hand.
// Source: docs/cqmAP-3a-2025-11-30-VENDOR-COUNTRY-SITE.xlsx (SelectionLists sheet)
// Regenerate: npm run gen:vocab

export const COMPONENT_TYPES = [
  "IC (Wafer production of IC containing the EMV payment application)",
  "IC (Wafer Test of IC containing the EMV payment application)",
  "IC (Backside processing and/or dicing of any IC)",
  "ICM",
  "aIL (no IC)",
  "icIL (IC and antenna)",
  "mIL (ICM and antenna)",
  "CB",
  "mICC (ICC made from ICM and CB)",
  "ilICC (ICC made from icIL, without ICM)",
  "Personalization",
  "iacICM",
  "fpBSM (with Fingerprint Sensor)",
  "imBSM (with Image Sensor)",
  "vcBSM (with Voice Sensor)",
  "iacIL (No IC)",
  "iacIL (with IC)",
  "fpIAC (with Fingerprint Sensor)",
  "imIAC (with Image Sensor)",
  "vcIAC (with Voice Sensor)",
  "sIAC (with Display)",
  "s+fpIAC (with Display and Fingerprint Sensor)",
  "s+imIAC (with Display and Image Sensor)",
  "s+vcIAC (with Display and Voice Sensor)",
  "fpApplet (Software in card to enable Fingerprint functionality)",
  "imApplet (Software in card to enable Image Recognition functionality)",
  "vcApplet (Software in card to enable Voice Recognition functionality)",
  "sApplet (Software in card to enable Display functionality)"
] as const;

export const PRODUCT_TYPES = [
  "IC",
  "ICM",
  "icIL (IC and antenna)",
  "mIL (ICM and antenna)",
  "CB",
  "mICC (ICC made from ICM and CB)",
  "ilICC (ICC made from icIL, without ICM)",
  "Personalization",
  "iacICM",
  "fpBSM (with Fingerprint Sensor)",
  "imBSM (with Image Sensor)",
  "vcBSM (with Voice Sensor)",
  "iacIL (No IC)",
  "iacIL (with IC)",
  "fpIAC (with Fingerprint Sensor)",
  "imIAC (with Image Sensor)",
  "vcIAC (with Voice Sensor)",
  "sIAC (with Display)",
  "s+fpIAC (with Display and Fingerprint Sensor)",
  "s+imIAC (with Display and Image Sensor)",
  "s+vcIAC (with Display and Voice Sensor)"
] as const;

export const CERT_STATUSES = [
  "Supplier (CQM certified)",
  "Supplier (CQM certification pending)",
  "Supplier (not CQM certified)",
  "Subcontractor (CQM certified themselves)",
  "Subcontractor (not CQM certified themselves)",
  "Other (Describe in Comments)"
] as const;

export const AUDIT_SCOPES = [
  "Initial",
  "Renewal"
] as const;

export const AUDIT_TYPES = [
  "On-site",
  "Remote"
] as const;

export const AUDITOR_VERDICTS = [
  "A",
  "B",
  "C",
  "D",
  "n/a",
  "tbd"
] as const;

export const VENDOR_PROCESS_STEP_CONFORMITY = [
  "tbd",
  "Yes",
  "No",
  "Not assessed",
  "CQM certified Component Vendor",
  "NOT CQM certified Component Vendor",
  "CQM certified Subcontractor",
  "NOT CQM certified Subcontractor",
  "n/a"
] as const;

export const VENDOR_STATUS_PRODUCT = [
  "tbd",
  "Yes",
  "Procedure only",
  "Practice only",
  "No",
  "Not assessed",
  "CQM certified Component Vendor",
  "NOT CQM certified Component Vendor",
  "CQM certified Subcontractor",
  "NOT CQM certified Subcontractor",
  "n/a"
] as const;

export const AUDITOR_CONFORMITY = [
  "NC+",
  "nc-",
  "RI",
  "Full",
  "NC+ (Subcontractor)",
  "nc- (Subcontractor)",
  "RI (Subcontractor)",
  "Full (Subcontractor)",
  "Not assessed (timing constraints)",
  "Not assessed (Subcontractor)",
  "tbd",
  "n/a"
] as const;

export const AUDITOR_CONFORMITY_NCC = [
  "NCC",
  "NC+",
  "nc-",
  "RI",
  "Full",
  "NCC (Subcontractor)",
  "NC+ (Subcontractor)",
  "nc- (Subcontractor)",
  "RI (Subcontractor)",
  "Full (Subcontractor)",
  "Not assessed (timing constraints)",
  "Not assessed (Subcontractor)",
  "tbd",
  "n/a"
] as const;

export const QMS_VENDOR_COMPLIANCE = [
  "Yes",
  "Procedure only",
  "Practice only",
  "No",
  "tbd",
  "n/a"
] as const;

export const AUDIT_GRADES = [
  "A",
  "B",
  "C",
  "D"
] as const;

export const COUNTRIES: ReadonlyArray<{ code: string; name: string }> = [
  {
    "code": "AD",
    "name": "Andorra"
  },
  {
    "code": "AE",
    "name": "United Arab Emirates"
  },
  {
    "code": "AF",
    "name": "Afghanistan"
  },
  {
    "code": "AG",
    "name": "Antigua and Barbuda"
  },
  {
    "code": "AI",
    "name": "Anguilla"
  },
  {
    "code": "AL",
    "name": "Albania"
  },
  {
    "code": "AM",
    "name": "Armenia"
  },
  {
    "code": "AO",
    "name": "Angola"
  },
  {
    "code": "AQ",
    "name": "Antarctica"
  },
  {
    "code": "AR",
    "name": "Argentina"
  },
  {
    "code": "AS",
    "name": "American Samoa"
  },
  {
    "code": "AT",
    "name": "Austria"
  },
  {
    "code": "AU",
    "name": "Australia"
  },
  {
    "code": "AW",
    "name": "Aruba"
  },
  {
    "code": "AX",
    "name": "Åland Islands"
  },
  {
    "code": "AZ",
    "name": "Azerbaijan"
  },
  {
    "code": "BA",
    "name": "Bosnia and Herzegovina"
  },
  {
    "code": "BB",
    "name": "Barbados"
  },
  {
    "code": "BD",
    "name": "Bangladesh"
  },
  {
    "code": "BE",
    "name": "Belgium"
  },
  {
    "code": "BF",
    "name": "Burkina Faso"
  },
  {
    "code": "BG",
    "name": "Bulgaria"
  },
  {
    "code": "BH",
    "name": "Bahrain"
  },
  {
    "code": "BI",
    "name": "Burundi"
  },
  {
    "code": "BJ",
    "name": "Benin"
  },
  {
    "code": "BL",
    "name": "Saint Barthélemy"
  },
  {
    "code": "BM",
    "name": "Bermuda"
  },
  {
    "code": "BN",
    "name": "Brunei Darussalam"
  },
  {
    "code": "BO",
    "name": "Bolivia (Plurinational State of)"
  },
  {
    "code": "BQ",
    "name": "Bonaire, Sint Eustatius and Saba"
  },
  {
    "code": "BR",
    "name": "Brazil"
  },
  {
    "code": "BS",
    "name": "Bahamas"
  },
  {
    "code": "BT",
    "name": "Bhutan"
  },
  {
    "code": "BV",
    "name": "Bouvet Island"
  },
  {
    "code": "BW",
    "name": "Botswana"
  },
  {
    "code": "BY",
    "name": "Belarus"
  },
  {
    "code": "BZ",
    "name": "Belize"
  },
  {
    "code": "CA",
    "name": "Canada"
  },
  {
    "code": "CC",
    "name": "Cocos (Keeling) Islands"
  },
  {
    "code": "CD",
    "name": "Congo, Democratic Republic of the"
  },
  {
    "code": "CF",
    "name": "Central African Republic"
  },
  {
    "code": "CG",
    "name": "Congo"
  },
  {
    "code": "CH",
    "name": "Switzerland"
  },
  {
    "code": "CI",
    "name": "Côte d'Ivoire"
  },
  {
    "code": "CK",
    "name": "Cook Islands"
  },
  {
    "code": "CL",
    "name": "Chile"
  },
  {
    "code": "CM",
    "name": "Cameroon"
  },
  {
    "code": "CN",
    "name": "China"
  },
  {
    "code": "CO",
    "name": "Colombia"
  },
  {
    "code": "CR",
    "name": "Costa Rica"
  },
  {
    "code": "CU",
    "name": "Cuba"
  },
  {
    "code": "CV",
    "name": "Cabo Verde"
  },
  {
    "code": "CW",
    "name": "Curaçao"
  },
  {
    "code": "CX",
    "name": "Christmas Island"
  },
  {
    "code": "CY",
    "name": "Cyprus"
  },
  {
    "code": "CZ",
    "name": "Czechia"
  },
  {
    "code": "DE",
    "name": "Germany"
  },
  {
    "code": "DJ",
    "name": "Djibouti"
  },
  {
    "code": "DK",
    "name": "Denmark"
  },
  {
    "code": "DM",
    "name": "Dominica"
  },
  {
    "code": "DO",
    "name": "Dominican Republic"
  },
  {
    "code": "DZ",
    "name": "Algeria"
  },
  {
    "code": "EC",
    "name": "Ecuador"
  },
  {
    "code": "EE",
    "name": "Estonia"
  },
  {
    "code": "EG",
    "name": "Egypt"
  },
  {
    "code": "EH",
    "name": "Western Sahara"
  },
  {
    "code": "ER",
    "name": "Eritrea"
  },
  {
    "code": "ES",
    "name": "Spain"
  },
  {
    "code": "ET",
    "name": "Ethiopia"
  },
  {
    "code": "FI",
    "name": "Finland"
  },
  {
    "code": "FJ",
    "name": "Fiji"
  },
  {
    "code": "FK",
    "name": "Falkland Islands (Malvinas)"
  },
  {
    "code": "FM",
    "name": "Micronesia (Federated States of)"
  },
  {
    "code": "FO",
    "name": "Faroe Islands"
  },
  {
    "code": "FR",
    "name": "France"
  },
  {
    "code": "GA",
    "name": "Gabon"
  },
  {
    "code": "GB",
    "name": "United Kingdom of Great Britain and Northern Ireland"
  },
  {
    "code": "GD",
    "name": "Grenada"
  },
  {
    "code": "GE",
    "name": "Georgia"
  },
  {
    "code": "GF",
    "name": "French Guiana"
  },
  {
    "code": "GG",
    "name": "Guernsey"
  },
  {
    "code": "GH",
    "name": "Ghana"
  },
  {
    "code": "GI",
    "name": "Gibraltar"
  },
  {
    "code": "GL",
    "name": "Greenland"
  },
  {
    "code": "GM",
    "name": "Gambia"
  },
  {
    "code": "GN",
    "name": "Guinea"
  },
  {
    "code": "GP",
    "name": "Guadeloupe"
  },
  {
    "code": "GQ",
    "name": "Equatorial Guinea"
  },
  {
    "code": "GR",
    "name": "Greece"
  },
  {
    "code": "GS",
    "name": "South Georgia and the South Sandwich Islands"
  },
  {
    "code": "GT",
    "name": "Guatemala"
  },
  {
    "code": "GU",
    "name": "Guam"
  },
  {
    "code": "GW",
    "name": "Guinea-Bissau"
  },
  {
    "code": "GY",
    "name": "Guyana"
  },
  {
    "code": "HK",
    "name": "Hong Kong"
  },
  {
    "code": "HM",
    "name": "Heard Island and McDonald Islands"
  },
  {
    "code": "HN",
    "name": "Honduras"
  },
  {
    "code": "HR",
    "name": "Croatia"
  },
  {
    "code": "HT",
    "name": "Haiti"
  },
  {
    "code": "HU",
    "name": "Hungary"
  },
  {
    "code": "ID",
    "name": "Indonesia"
  },
  {
    "code": "IE",
    "name": "Ireland"
  },
  {
    "code": "IL",
    "name": "Israel"
  },
  {
    "code": "IM",
    "name": "Isle of Man"
  },
  {
    "code": "IN",
    "name": "India"
  },
  {
    "code": "IO",
    "name": "British Indian Ocean Territory"
  },
  {
    "code": "IQ",
    "name": "Iraq"
  },
  {
    "code": "IR",
    "name": "Iran (Islamic Republic of)"
  },
  {
    "code": "IS",
    "name": "Iceland"
  },
  {
    "code": "IT",
    "name": "Italy"
  },
  {
    "code": "JE",
    "name": "Jersey"
  },
  {
    "code": "JM",
    "name": "Jamaica"
  },
  {
    "code": "JO",
    "name": "Jordan"
  },
  {
    "code": "JP",
    "name": "Japan"
  },
  {
    "code": "KE",
    "name": "Kenya"
  },
  {
    "code": "KG",
    "name": "Kyrgyzstan"
  },
  {
    "code": "KH",
    "name": "Cambodia"
  },
  {
    "code": "KI",
    "name": "Kiribati"
  },
  {
    "code": "KM",
    "name": "Comoros"
  },
  {
    "code": "KN",
    "name": "Saint Kitts and Nevis"
  },
  {
    "code": "KP",
    "name": "Korea (Democratic People's Republic of)"
  },
  {
    "code": "KR",
    "name": "Korea, Republic of"
  },
  {
    "code": "KW",
    "name": "Kuwait"
  },
  {
    "code": "KY",
    "name": "Cayman Islands"
  },
  {
    "code": "KZ",
    "name": "Kazakhstan"
  },
  {
    "code": "LA",
    "name": "Lao People's Democratic Republic"
  },
  {
    "code": "LB",
    "name": "Lebanon"
  },
  {
    "code": "LC",
    "name": "Saint Lucia"
  },
  {
    "code": "LI",
    "name": "Liechtenstein"
  },
  {
    "code": "LK",
    "name": "Sri Lanka"
  },
  {
    "code": "LR",
    "name": "Liberia"
  },
  {
    "code": "LS",
    "name": "Lesotho"
  },
  {
    "code": "LT",
    "name": "Lithuania"
  },
  {
    "code": "LU",
    "name": "Luxembourg"
  },
  {
    "code": "LV",
    "name": "Latvia"
  },
  {
    "code": "LY",
    "name": "Libya"
  },
  {
    "code": "MA",
    "name": "Morocco"
  },
  {
    "code": "MC",
    "name": "Monaco"
  },
  {
    "code": "MD",
    "name": "Moldova, Republic of"
  },
  {
    "code": "ME",
    "name": "Montenegro"
  },
  {
    "code": "MF",
    "name": "Saint Martin (French part)"
  },
  {
    "code": "MG",
    "name": "Madagascar"
  },
  {
    "code": "MH",
    "name": "Marshall Islands"
  },
  {
    "code": "MK",
    "name": "North Macedonia"
  },
  {
    "code": "ML",
    "name": "Mali"
  },
  {
    "code": "MM",
    "name": "Myanmar"
  },
  {
    "code": "MN",
    "name": "Mongolia"
  },
  {
    "code": "MO",
    "name": "Macao"
  },
  {
    "code": "MP",
    "name": "Northern Mariana Islands"
  },
  {
    "code": "MQ",
    "name": "Martinique"
  },
  {
    "code": "MR",
    "name": "Mauritania"
  },
  {
    "code": "MS",
    "name": "Montserrat"
  },
  {
    "code": "MT",
    "name": "Malta"
  },
  {
    "code": "MU",
    "name": "Mauritius"
  },
  {
    "code": "MV",
    "name": "Maldives"
  },
  {
    "code": "MW",
    "name": "Malawi"
  },
  {
    "code": "MX",
    "name": "Mexico"
  },
  {
    "code": "MY",
    "name": "Malaysia"
  },
  {
    "code": "MZ",
    "name": "Mozambique"
  },
  {
    "code": "NA",
    "name": "Namibia"
  },
  {
    "code": "NC",
    "name": "New Caledonia"
  },
  {
    "code": "NE",
    "name": "Niger"
  },
  {
    "code": "NF",
    "name": "Norfolk Island"
  },
  {
    "code": "NG",
    "name": "Nigeria"
  },
  {
    "code": "NI",
    "name": "Nicaragua"
  },
  {
    "code": "NL",
    "name": "Netherlands, Kingdom of the"
  },
  {
    "code": "NO",
    "name": "Norway"
  },
  {
    "code": "NP",
    "name": "Nepal"
  },
  {
    "code": "NR",
    "name": "Nauru"
  },
  {
    "code": "NU",
    "name": "Niue"
  },
  {
    "code": "NZ",
    "name": "New Zealand"
  },
  {
    "code": "OM",
    "name": "Oman"
  },
  {
    "code": "PA",
    "name": "Panama"
  },
  {
    "code": "PE",
    "name": "Peru"
  },
  {
    "code": "PF",
    "name": "French Polynesia"
  },
  {
    "code": "PG",
    "name": "Papua New Guinea"
  },
  {
    "code": "PH",
    "name": "Philippines"
  },
  {
    "code": "PK",
    "name": "Pakistan"
  },
  {
    "code": "PL",
    "name": "Poland"
  },
  {
    "code": "PM",
    "name": "Saint Pierre and Miquelon"
  },
  {
    "code": "PN",
    "name": "Pitcairn"
  },
  {
    "code": "PR",
    "name": "Puerto Rico"
  },
  {
    "code": "PS",
    "name": "Palestine, State of"
  },
  {
    "code": "PT",
    "name": "Portugal"
  },
  {
    "code": "PW",
    "name": "Palau"
  },
  {
    "code": "PY",
    "name": "Paraguay"
  },
  {
    "code": "QA",
    "name": "Qatar"
  },
  {
    "code": "RE",
    "name": "Réunion"
  },
  {
    "code": "RO",
    "name": "Romania"
  },
  {
    "code": "RS",
    "name": "Serbia"
  },
  {
    "code": "RU",
    "name": "Russian Federation"
  },
  {
    "code": "RW",
    "name": "Rwanda"
  },
  {
    "code": "SA",
    "name": "Saudi Arabia"
  },
  {
    "code": "SB",
    "name": "Solomon Islands"
  },
  {
    "code": "SC",
    "name": "Seychelles"
  },
  {
    "code": "SD",
    "name": "Sudan"
  },
  {
    "code": "SE",
    "name": "Sweden"
  },
  {
    "code": "SG",
    "name": "Singapore"
  },
  {
    "code": "SH",
    "name": "Saint Helena, Ascension and Tristan da Cunha"
  },
  {
    "code": "SI",
    "name": "Slovenia"
  },
  {
    "code": "SJ",
    "name": "Svalbard and Jan Mayen"
  },
  {
    "code": "SK",
    "name": "Slovakia"
  },
  {
    "code": "SL",
    "name": "Sierra Leone"
  },
  {
    "code": "SM",
    "name": "San Marino"
  },
  {
    "code": "SN",
    "name": "Senegal"
  },
  {
    "code": "SO",
    "name": "Somalia"
  },
  {
    "code": "SR",
    "name": "Suriname"
  },
  {
    "code": "SS",
    "name": "South Sudan"
  },
  {
    "code": "ST",
    "name": "Sao Tome and Principe"
  },
  {
    "code": "SV",
    "name": "El Salvador"
  },
  {
    "code": "SX",
    "name": "Sint Maarten (Dutch part)"
  },
  {
    "code": "SY",
    "name": "Syrian Arab Republic"
  },
  {
    "code": "SZ",
    "name": "Eswatini"
  },
  {
    "code": "TC",
    "name": "Turks and Caicos Islands"
  },
  {
    "code": "TD",
    "name": "Chad"
  },
  {
    "code": "TF",
    "name": "French Southern Territories"
  },
  {
    "code": "TG",
    "name": "Togo"
  },
  {
    "code": "TH",
    "name": "Thailand"
  },
  {
    "code": "TJ",
    "name": "Tajikistan"
  },
  {
    "code": "TK",
    "name": "Tokelau"
  },
  {
    "code": "TL",
    "name": "Timor-Leste"
  },
  {
    "code": "TM",
    "name": "Turkmenistan"
  },
  {
    "code": "TN",
    "name": "Tunisia"
  },
  {
    "code": "TO",
    "name": "Tonga"
  },
  {
    "code": "TR",
    "name": "Türkiye"
  },
  {
    "code": "TT",
    "name": "Trinidad and Tobago"
  },
  {
    "code": "TV",
    "name": "Tuvalu"
  },
  {
    "code": "TW",
    "name": "Taiwan"
  },
  {
    "code": "TZ",
    "name": "Tanzania, United Republic of"
  },
  {
    "code": "UA",
    "name": "Ukraine"
  },
  {
    "code": "UG",
    "name": "Uganda"
  },
  {
    "code": "UM",
    "name": "United States Minor Outlying Islands"
  },
  {
    "code": "US",
    "name": "United States of America"
  },
  {
    "code": "UY",
    "name": "Uruguay"
  },
  {
    "code": "UZ",
    "name": "Uzbekistan"
  },
  {
    "code": "VA",
    "name": "Holy See"
  },
  {
    "code": "VC",
    "name": "Saint Vincent and the Grenadines"
  },
  {
    "code": "VE",
    "name": "Venezuela (Bolivarian Republic of)"
  },
  {
    "code": "VG",
    "name": "Virgin Islands (British)"
  },
  {
    "code": "VI",
    "name": "Virgin Islands (U.S.)"
  },
  {
    "code": "VN",
    "name": "Viet Nam"
  },
  {
    "code": "VU",
    "name": "Vanuatu"
  },
  {
    "code": "WF",
    "name": "Wallis and Futuna"
  },
  {
    "code": "WS",
    "name": "Samoa"
  },
  {
    "code": "YE",
    "name": "Yemen"
  },
  {
    "code": "YT",
    "name": "Mayotte"
  },
  {
    "code": "ZA",
    "name": "South Africa"
  },
  {
    "code": "ZM",
    "name": "Zambia"
  },
  {
    "code": "ZW",
    "name": "Zimbabwe"
  }
];

export type ComponentType = typeof COMPONENT_TYPES[number];
export type UsedForProduct = typeof PRODUCT_TYPES[number];
export type CertStatus = typeof CERT_STATUSES[number];
