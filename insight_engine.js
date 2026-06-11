/* Insight engine — court/judge intelligence and recommendations — Stage 2 */
var InsightEngine = (function () {
  function enhancedSimilarity(closed, live) {
    if (!closed || !live) return 0;
    var score = 0;
    if (closed.disruptionType === live.disruptionType) score += 35;
    if (closed.jurisdiction === live.jurisdiction) score += 22;
    if (closed.region && live.region && closed.region === live.region) score += 8;
    if (closed.courtId && live.courtId && closed.courtId === live.courtId) score += 12;
    if (closed.judgeId && live.judgeId && closed.judgeId === live.judgeId) score += 10;
    var closedTags = typeof InsightTags !== 'undefined' ? InsightTags.tagsForCase(closed) : closed.strategyTags || [];
    var liveTags = typeof InsightTags !== 'undefined' ? InsightTags.tagsForDisruption(live.disruptionType) : [];
    closedTags.forEach(function (t) {
      if (liveTags.indexOf(t) >= 0) score += 4;
    });
    if (
      String(closed.solicitor || '')
        .split(' ')[0]
        .toLowerCase() ===
      String(live.solicitor || '')
        .split(' ')[0]
        .toLowerCase()
    ) {
      score += 6;
    }
    if (String(closed.value).replace(/\D/g, '') === String(live.value).replace(/\D/g, '')) score += 6;
    if (closed.outcome === 'defended' || closed.outcome === 'withdrawn') score += 6;
    return Math.min(98, score);
  }

  function getSimilarClosedCases(liveCase, limit) {
    var archive = typeof repoCases === 'function' ? repoCases() : [];
    return archive
      .map(function (c) {
        return { case: c, score: enhancedSimilarity(c, liveCase) };
      })
      .filter(function (x) {
        return x.score >= 30;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, limit || 5);
  }

  function getCourtProfile(courtId) {
    return typeof getCourtById === 'function' ? getCourtById(courtId) : null;
  }

  function getJudgeProfile(judgeId) {
    return typeof getJudgeById === 'function' ? getJudgeById(judgeId) : null;
  }

  function aggregateCourtStats(cases, courtId, disruption) {
    var subset = cases.filter(function (c) {
      if (c.courtId !== courtId) return false;
      if (disruption && c.disruptionType !== disruption) return false;
      return true;
    });
    if (!subset.length) return null;
    var defended = subset.filter(function (c) {
      return c.outcome === 'defended' || c.outcome === 'withdrawn';
    }).length;
    return {
      sample: subset.length,
      defendRate: Math.round((defended / subset.length) * 100)
    };
  }

  function getImprovementSuggestions(filters) {
    var f = typeof InsightsSearch !== 'undefined' ? InsightsSearch.normalizeFilters(filters) : {};
    var cases = typeof InsightsSearch !== 'undefined' ? InsightsSearch.filterCases(repoCases(), f) : repoCases();
    var suggestions = [];
    var courts = {};

    cases.forEach(function (c) {
      if (!c.courtId) return;
      if (!courts[c.courtId]) courts[c.courtId] = { court: c.court, disruption: {}, evidence: {} };
      var key = c.disruptionType || 'Other';
      if (!courts[c.courtId].disruption[key]) courts[c.courtId].disruption[key] = { total: 0, win: 0, evidence: {} };
      var bucket = courts[c.courtId].disruption[key];
      bucket.total++;
      if (c.outcome === 'defended' || c.outcome === 'withdrawn') bucket.win++;
      (c.evidence || []).forEach(function (ev) {
        bucket.evidence[ev] = (bucket.evidence[ev] || 0) + 1;
      });
    });

    Object.keys(courts).forEach(function (courtId) {
      var courtMeta = typeof getCourtById === 'function' ? getCourtById(courtId) : null;
      Object.keys(courts[courtId].disruption).forEach(function (disruption) {
        var b = courts[courtId].disruption[disruption];
        var rate = b.total ? Math.round((b.win / b.total) * 100) : 0;
        var topEvidence = Object.keys(b.evidence).sort(function (a, bKey) {
          return b.evidence[bKey] - b.evidence[aKey];
        })[0];
        suggestions.push({
          priority: rate >= 70 ? 'high' : rate >= 50 ? 'medium' : 'low',
          courtId: courtId,
          court: courts[courtId].court,
          disruption: disruption,
          defendRate: rate,
          sample: b.total,
          evidence: topEvidence,
          text:
            'In ' +
            (courts[courtId].court || courtId) +
            ', ' +
            disruption +
            ' defences succeed ' +
            rate +
            '% when ' +
            (topEvidence || 'full evidence pack') +
            ' is attached.'
        });
      });
      if (courtMeta && courtMeta.notes) {
        suggestions.push({
          priority: 'info',
          courtId: courtId,
          court: courtMeta.name,
          text: courtMeta.notes
        });
      }
    });

    if (typeof ALL_CASES !== 'undefined' && f.disruption) {
      ALL_CASES.filter(function (c) {
        return c.stage !== 'resolve' && c.disruptionType === f.disruption;
      }).forEach(function (live) {
        var best = getSimilarClosedCases(live, 1)[0];
        if (best && best.score >= 45) {
          suggestions.push({
            priority: 'urgent',
            liveRef: live.ref,
            text:
              'Active case ' +
              live.ref +
              ' matches archive pattern ' +
              best.case.ref +
              ' (' +
              best.score +
              '%) — ' +
              best.case.recommendation
          });
        }
      });
    }

    return suggestions.sort(function (a, b) {
      var order = { urgent: 0, high: 1, medium: 2, low: 3, info: 4 };
      return (order[a.priority] || 9) - (order[b.priority] || 9);
    });
  }

  function searchIntelligence(filters) {
    var f = InsightsSearch.normalizeFilters(filters);
    var closed = InsightsSearch.filterCases(repoCases(), f);
    var courtIds = {};
    var judgeIds = {};
    closed.forEach(function (c) {
      if (c.courtId) courtIds[c.courtId] = true;
      if (c.judgeId) judgeIds[c.judgeId] = true;
    });
    if (f.court !== 'all') courtIds[f.court] = true;

    var courts = Object.keys(courtIds)
      .map(function (id) {
        return getCourtProfile(id);
      })
      .filter(Boolean);
    var judges = Object.keys(judgeIds)
      .map(function (id) {
        return getJudgeProfile(id);
      })
      .filter(Boolean);

    if (!courts.length && f.jurisdiction === 'spain') {
      courts = COURT_PROFILES.filter(function (c) {
        return c.jurisdiction === 'spain';
      });
    }

    return {
      closed: closed,
      courts: courts,
      judges: judges,
      suggestions: getImprovementSuggestions(f),
      updates: typeof InsightTags !== 'undefined' ? InsightTags.updatesForFilters(f) : []
    };
  }

  function getInsightSuggestions(ref) {
    var c = typeof getCase === 'function' ? getCase(ref) : null;
    if (!c) return null;
    var similar = getSimilarClosedCases(c, 1)[0];
    var court =
      similar && similar.case && similar.case.courtId
        ? getCourtProfile(similar.case.courtId)
        : null;
    var judge =
      similar && similar.case && similar.case.judgeId
        ? getJudgeProfile(similar.case.judgeId)
        : null;
    var draftingHint = '';
    if (c.jurisdiction === 'spain') {
      draftingHint =
        'Use formal Spanish contestación tone with numbered exhibits — typical in Juzgado de lo Mercantil.';
    } else if (c.jurisdiction === 'france') {
      draftingHint = 'Reference MTV mediation status where applicable before substantive defence.';
    }
    var exploreUrl =
      typeof InsightsSearch !== 'undefined'
        ? InsightsSearch.toQueryString('intelligence', {
            disruption: c.disruptionType,
            jurisdiction: c.jurisdiction
          })
        : 'insights.html?tab=intelligence';
    return {
      caseRef: ref,
      similar: similar,
      court: court,
      judge: judge,
      recommendation: similar ? similar.case.recommendation : '',
      strategyTags: similar ? similar.case.strategyTags || [] : [],
      missingEvidence: similar ? (similar.case.evidence || []).slice(0, 4) : [],
      draftingHint: draftingHint,
      exploreUrl: exploreUrl
    };
  }

  return {
    enhancedSimilarity: enhancedSimilarity,
    getSimilarClosedCases: getSimilarClosedCases,
    getCourtProfile: getCourtProfile,
    getJudgeProfile: getJudgeProfile,
    getImprovementSuggestions: getImprovementSuggestions,
    searchIntelligence: searchIntelligence,
    getInsightSuggestions: getInsightSuggestions
  };
})();

function getInsightSuggestions(ref) {
  return InsightEngine.getInsightSuggestions(ref);
}

/* Back-compat alias */
function getSimilarClosedCases(liveCase, limit) {
  return InsightEngine.getSimilarClosedCases(liveCase, limit);
}

function similarityScore(closed, live) {
  return InsightEngine.enhancedSimilarity(closed, live);
}

function getLiveSimilarCases(limit) {
  if (typeof ALL_CASES === 'undefined') return [];
  return ALL_CASES.filter(function (c) {
    return c.stage !== 'resolve';
  })
    .map(function (live) {
      var best = InsightEngine.getSimilarClosedCases(live, 1)[0];
      return { live: live, best: best ? best.case : null, score: best ? best.score : 0 };
    })
    .filter(function (x) {
      return x.best && x.score >= 40;
    })
    .sort(function (a, b) {
      return b.score - a.score;
    })
    .slice(0, limit || 4);
}
