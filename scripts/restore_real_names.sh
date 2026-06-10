#!/usr/bin/env bash
# restore_real_names.sh
# Reverts system name aliases back to real internal names.
# Run from repo root: bash scripts/restore_real_names.sh
set -e
FILES=$(grep -rl --include="*.js" --include="*.html" --include="*.css"   "Operational delay records system\|operational delay records system\|Crew scheduling system\|crew scheduling system\|Disruption data system\|disruption data system\|Safety reporting system\|safety reporting system\|Correspondence management system\|correspondence management system\|Maintenance records system\|maintenance records system\|Document management system\|document management system\|TOPS —\|DISCO —\|AIMS —\|SafetyNet Reports\|HERMES\|AMOS —\|DocuNet" . 2>/dev/null || true)
if [ -z "$FILES" ]; then echo "No aliased files found."; exit 0; fi
echo "$FILES" | while IFS= read -r f; do
  sed -i \
    -e 's/Operational delay records system/TOPS/g' \
    -e 's/operational delay records system/TOPS/g' \
    -e 's/TOPS — Flight Details/TOPS — Flight Details/g' \
    -e 's/Crew scheduling system/AIMS/g' \
    -e 's/crew scheduling system/AIMS/g' \
    -e 's/Disruption data system/DISCO/g' \
    -e 's/disruption data system/DISCO/g' \
    -e 's/Safety reporting system/SafetyNet/g' \
    -e 's/safety reporting system/SafetyNet/g' \
    -e 's/Correspondence management system/HERMES/g' \
    -e 's/correspondence management system/HERMES/g' \
    -e 's/Maintenance records system/AMOS/g' \
    -e 's/maintenance records system/AMOS/g' \
    -e 's/Document management system/DocuNet/g' \
    -e 's/document management system/DocuNet/g' \
    "$f"
done
echo "Revert complete. Real names restored across all files."
