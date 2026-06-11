/* Shared insight taxonomy — links disruption, evidence, drafting, case law — Stage 3 */
var InsightTags = (function () {
  var DISRUPTION_TAGS = {
    Birdstrike: ['birdstrike-ec', 'reasonable-measures', 'peskova'],
    Weather: ['weather-ec', 'metar-sigmet'],
    'ATC Restrictions': ['atc-ec', 'eurocontrol'],
    'Technical Issues': ['technical-defect', 'van-der-lans']
  };

  var EVIDENCE_TAG_LABELS = {
    'maintenance-log': 'Maintenance log',
    'crew-report': 'Crew report',
    'airport-bird-log': 'Airport bird log',
    'metar-sigmet': 'METAR / SIGMET',
    'eurocontrol-atfm': 'Eurocontrol ATFM',
    'passenger-care': 'Passenger care records'
  };

  function tagsForDisruption(type) {
    return DISRUPTION_TAGS[type] || [];
  }

  function tagsForCase(c) {
    if (!c) return [];
    var set = {};
    tagsForDisruption(c.disruptionType).forEach(function (t) {
      set[t] = true;
    });
    (c.strategyTags || []).forEach(function (t) {
      set[t] = true;
    });
    (c.evidenceTags || []).forEach(function (t) {
      set[t] = true;
    });
    (c.draftingTags || []).forEach(function (t) {
      set[t] = true;
    });
    return Object.keys(set);
  }

  function matchesFilters(itemTags, filters) {
    filters = filters || {};
    var disruption = filters.disruption
      ? InsightsSearch.slugDisruption(filters.disruption) || filters.disruption
      : '';
    if (disruption && DISRUPTION_TAGS[disruption]) {
      var needed = DISRUPTION_TAGS[disruption];
      if (!needed.some(function (t) { return itemTags.indexOf(t) >= 0; })) {
        if (filters.disruption && itemTags.length) {
          /* also match by disruption string on update metadata */
        }
      }
    }
    return true;
  }

  function updatesForFilters(filters) {
    if (typeof EducationIndex === 'undefined') return [];
    var f = InsightsSearch.normalizeFilters(filters);
    return EducationIndex.getUpdates().filter(function (u) {
      if (f.jurisdiction !== 'all' && u.affectsJurisdictions.indexOf(f.jurisdiction) < 0) return false;
      if (f.disruption && u.affectsDisruptions.indexOf(f.disruption) < 0) return false;
      if (f.q) {
        var hay = [u.title, u.summary, u.source, (u.tags || []).join(' ')].join(' ').toLowerCase();
        if (hay.indexOf(f.q.toLowerCase()) < 0) return false;
      }
      return true;
    });
  }

  function authoritiesForCase(c) {
    var tags = tagsForCase(c);
    var cites = (c.caseLaw || []).map(function (n) {
      return String(n).toLowerCase();
    });
    return (typeof EducationIndex !== 'undefined' ? EducationIndex.getCaseLaw() : []).filter(function (cl) {
      return (
        cl.tags.some(function (t) {
          return tags.indexOf(t) >= 0;
        }) ||
        cites.some(function (cite) {
          return String(cl.name).toLowerCase().indexOf(cite) >= 0 || cite.indexOf(String(cl.name).toLowerCase()) >= 0;
        })
      );
    });
  }

  function educationLink(update) {
    if (!update) return 'education.html?section=updates';
    return (
      'education.html?section=' +
      (update.educationSection || 'updates') +
      (update.educationAnchor ? '#' + update.educationAnchor : '')
    );
  }

  function labelForEvidenceTag(tag) {
    return EVIDENCE_TAG_LABELS[tag] || tag.replace(/-/g, ' ');
  }

  return {
    tagsForDisruption: tagsForDisruption,
    tagsForCase: tagsForCase,
    updatesForFilters: updatesForFilters,
    authoritiesForCase: authoritiesForCase,
    educationLink: educationLink,
    labelForEvidenceTag: labelForEvidenceTag
  };
})();
