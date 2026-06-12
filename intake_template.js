/* Master intake spreadsheet — v1.1 deterministic column schema */
var INTAKE_TEMPLATE_VERSION = '1.1';
var INTAKE_TEMPLATE_FILENAME = '261claims-intake-master.csv';

var INTAKE_TEMPLATE_COLUMNS = [
  'ref',
  'surname',
  'firstName',
  'solicitor',
  'flightNum',
  'dep',
  'arr',
  'flightDate',
  'currency',
  'compSought',
  'claimType',
  'jurisdictionCode',
  'disruptionType',
  'triage',
  'complexity',
  'dateReceived',
  'notes'
];

var INTAKE_ALLOWED = {
  jurisdictionCode: ['EW', 'FR', 'ES', 'EU'],
  triage: ['DEFEND', 'INVESTIGATE', 'ESCALATE'],
  complexity: ['Standard', 'Complex', 'High Value'],
  currency: ['GBP', 'EUR'],
  disruptionType: ['Delay', 'Cancellation', 'Denied Boarding', 'Downgrade']
};

var INTAKE_DISRUPTION_MAP = {
  'Delay >3hrs': 'Delay',
  'Cancellation': 'Cancellation',
  'Denied Boarding': 'Denied Boarding',
  'Downgrade': 'Downgrade'
};

function mapDisruptionType(raw) {
  var key = String(raw || '').trim();
  return INTAKE_DISRUPTION_MAP[key] || key || 'Pending review';
}

function parseCsvLine(line) {
  var out = [];
  var cur = '';
  var inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line.charAt(i);
    if (ch === '"') {
      if (inQuotes && line.charAt(i + 1) === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  var lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(function (line) {
      return line.trim().length > 0;
    });
  if (!lines.length) return { headers: [], rows: [] };

  var headers = parseCsvLine(lines[0]).map(function (h) {
    return h.trim();
  });
  var rows = [];
  for (var i = 1; i < lines.length; i++) {
    var cells = parseCsvLine(lines[i]);
    var obj = {};
    headers.forEach(function (key, idx) {
      obj[key] = (cells[idx] != null ? cells[idx] : '').trim();
    });
    rows.push(obj);
  }
  return { headers: headers, rows: rows };
}

function validateTemplateHeaders(headers) {
  var missing = INTAKE_TEMPLATE_COLUMNS.filter(function (col) {
    return headers.indexOf(col) < 0;
  });
  if (missing.length) {
    return 'Missing required columns: ' + missing.join(', ');
  }
  return null;
}

function normalizeIntakeRow(row) {
  row = row || {};
  var out = {};
  INTAKE_TEMPLATE_COLUMNS.forEach(function (col) {
    out[col] = String(row[col] != null ? row[col] : '').trim();
  });
  out.jurisdictionCode = (out.jurisdictionCode || 'EW').toUpperCase();
  out.currency = (out.currency || 'EUR').toUpperCase();
  out.triage = (out.triage || 'INVESTIGATE').toUpperCase();
  if (INTAKE_ALLOWED.triage.indexOf(out.triage) < 0) out.triage = 'INVESTIGATE';
  if (!out.complexity) out.complexity = 'Standard';
  out.disruptionType = mapDisruptionType(out.disruptionType);
  return out;
}

function validateIntakeRow(row, lineNum) {
  var errors = [];
  if (!row.surname) errors.push('line ' + lineNum + ': surname is required');
  if (!row.firstName) errors.push('line ' + lineNum + ': firstName is required');
  if (INTAKE_ALLOWED.jurisdictionCode.indexOf(row.jurisdictionCode) < 0) {
    errors.push('line ' + lineNum + ': jurisdictionCode must be EW, FR, ES, or EU');
  }
  if (row.triage && INTAKE_ALLOWED.triage.indexOf(row.triage) < 0) {
    errors.push('line ' + lineNum + ': triage must be DEFEND, INVESTIGATE, or ESCALATE');
  }
  if (row.complexity && INTAKE_ALLOWED.complexity.indexOf(row.complexity) < 0) {
    errors.push('line ' + lineNum + ': complexity must be Standard, Complex, or High Value');
  }
  if (row.currency && INTAKE_ALLOWED.currency.indexOf(row.currency) < 0) {
    errors.push('line ' + lineNum + ': currency must be GBP or EUR');
  }
  return errors;
}

function sortIntakeRowsDeterministic(rows) {
  return rows.slice().sort(function (a, b) {
    var j = (a.jurisdictionCode || 'EW').localeCompare(b.jurisdictionCode || 'EW');
    if (j) return j;
    var da = parseLocDateReceived(a.dateReceived).getTime();
    var db = parseLocDateReceived(b.dateReceived).getTime();
    if (da !== db) return da - db;
    var s = (a.surname || '').localeCompare(b.surname || '');
    if (s) return s;
    var f = (a.firstName || '').localeCompare(b.firstName || '');
    if (f) return f;
    return (a.ref || '').localeCompare(b.ref || '');
  });
}

function rowsFromSpreadsheetText(text) {
  var parsed = parseCsv(text);
  var headerErr = validateTemplateHeaders(parsed.headers);
  if (headerErr) return { error: headerErr, rows: [] };

  var rows = [];
  var errors = [];
  parsed.rows.forEach(function (raw, idx) {
    var row = normalizeIntakeRow(raw);
    var rowErrs = validateIntakeRow(row, idx + 2);
    if (rowErrs.length) errors = errors.concat(rowErrs);
    else rows.push(row);
  });

  if (errors.length) return { error: errors.join('; '), rows: [] };
  if (!rows.length) return { error: 'Spreadsheet contains no data rows.', rows: [] };
  return { error: null, rows: rows };
}

function assignBatchDeterministic(rows, refFn) {
  var sorted = sortIntakeRowsDeterministic(rows);
  var batchAssigned = [];
  return sorted.map(function (row, i) {
    if (!row.ref) row.ref = refFn(i);
    var assignee = pickDeterministicAssignee(row.jurisdictionCode, batchAssigned);
    batchAssigned.push({ assignedTo: assignee, stage: 'intake' });
    return {
      row: row,
      assignee: assignee,
      sortOrder: i + 1,
      file: {
        name: INTAKE_TEMPLATE_FILENAME,
        size: 0,
        type: 'text/csv'
      }
    };
  });
}

function buildMassItemsFromRows(rows, refFn) {
  return assignBatchDeterministic(rows, refFn);
}

function downloadMasterTemplate() {
  var link = document.createElement('a');
  link.href = 'templates/' + INTAKE_TEMPLATE_FILENAME;
  link.download = INTAKE_TEMPLATE_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function readSpreadsheetFile(file, callback) {
  var reader = new FileReader();
  reader.onload = function (e) {
    var result = rowsFromSpreadsheetText(e.target.result);
    callback(result.error, result.rows, file);
  };
  reader.onerror = function () {
    callback('Could not read spreadsheet file.', [], file);
  };
  reader.readAsText(file);
}
