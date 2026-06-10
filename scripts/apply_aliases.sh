#!/usr/bin/env bash
# apply_aliases.sh
# Applies IP-safe aliases over real internal system names.
# Run from repo root: bash scripts/apply_aliases.sh
set -e
FILES=$(grep -rl --include="*.js" --include="*.html" \
  "TOPS\|AIMS\|DISCO\|SafetyNet\|HERMES\|AMOS\|DocuNet" . \
  --exclude-dir=scripts 2>/dev/null || true)
if [ -z "$FILES" ]; then echo "No files with real names found."; exit 0; fi
echo "$FILES" | while IFS= read -r f; do
  sed -i \
    -e 's/TOPS — Flight Details & Legislation Report/Operational delay records system — Flight Details & Legislation Report/g' \
    -e 's/TOPS — Flight Details & Legislation/Operational delay records system — Flight Details & Legislation/g' \
    -e 's/TOPS — Flight Details/Operational delay records system — Flight Details/g' \
    -e 's/Internal — TOPS/Internal — Operational delay records system/g' \
    -e 's/Internal TOPS/Internal operational delay records system/g' \
    -e "s/'tops'/'ords'/g" \
    -e 's/TOPS/Operational delay records system/g' \
    -e 's/AIMS — Crew Route & FDP/Crew scheduling system — Crew Route & FDP/g' \
    -e 's/AIMS — Crew Route/Crew scheduling system — Crew Route/g' \
    -e 's/Internal — AIMS/Internal — Crew scheduling system/g' \
    -e 's/Internal AIMS/Internal crew scheduling system/g' \
    -e "s/'aims'/'css'/g" \
    -e 's/AIMS/Crew scheduling system/g' \
    -e 's/DISCO — Disruption Record/Disruption data system — Disruption Record/g' \
    -e 's/Internal — DISCO/Internal — Disruption data system/g' \
    -e 's/Internal DISCO/Internal disruption data system/g' \
    -e "s/'disco'/'dds'/g" \
    -e 's/DISCO/Disruption data system/g' \
    -e 's/SafetyNet Reports/Safety reporting system Reports/g' \
    -e 's/Internal — SafetyNet/Internal — Safety reporting system/g' \
    -e 's/Internal SafetyNet/Internal safety reporting system/g' \
    -e "s/'safetynet'/'srs'/g" \
    -e 's/SafetyNet/Safety reporting system/g' \
    -e 's/Internal — HERMES/Internal — Correspondence management system/g' \
    -e 's/Internal HERMES/Internal correspondence management system/g' \
    -e "s/'hermes'/'cms'/g" \
    -e 's/HERMES/Correspondence management system/g' \
    -e 's/AMOS — Technical Event Record/Maintenance records system — Technical Event Record/g' \
    -e 's/AMOS — Technical Events/Maintenance records system — Technical Events/g' \
    -e 's/Internal — AMOS/Internal — Maintenance records system/g' \
    -e 's/Internal AMOS/Internal maintenance records system/g' \
    -e "s/'amos'/'mrs'/g" \
    -e 's/AMOS/Maintenance records system/g' \
    -e 's/Internal — DocuNet/Internal — Document management system/g' \
    -e "s/'docunet'/'dms'/g" \
    -e 's/DocuNet/Document management system/g' \
    "$f"
done
echo "Aliases applied. All real system names replaced."
