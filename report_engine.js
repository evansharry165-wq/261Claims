/* Live monthly litigation report — computed from portfolio cases */
(function (global) {
  'use strict';

  var JUR_META = {
    'england-wales': { name: 'England & Wales', code: 'EW' },
    france: { name: 'France', code: 'FR' },
    spain: { name: 'Spain', code: 'ES' },
  };

  function parseClaimValue(c) {
    var raw = c.compSought != null ? c.compSought : c.value || '0';
    var s = String(raw).replace(/,/g, '');
    var m = s.match(/([\d]+(?:\.\d+)?)/);
    var n = m ? parseFloat(m[1]) : 0;
    if (/€|eur/i.test(s)) n = Math.round(n * 0.86);
    return n;
  }

  function monthLabel(d) {
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }

  function build(cases, knowledgeEntries) {
    cases = cases || [];
    knowledgeEntries = knowledgeEntries || [];
    var now = new Date();
    var open = cases.filter(function (c) {
      return c.stage !== 'resolve';
    });
    var closed = cases.filter(function (c) {
      return c.stage === 'resolve';
    });
    var escalate = open.filter(function (c) {
      return c.classification === 'ESCALATE';
    });
    var urgent = open.filter(function (c) {
      return (c.cprDaysLeft || 99) <= 3;
    });
    var defend = open.filter(function (c) {
      return c.classification === 'DEFEND';
    });

    var gross = open.reduce(function (sum, c) {
      return sum + parseClaimValue(c);
    }, 0);
    var netEstimate = Math.round(
      open.reduce(function (sum, c) {
        var v = parseClaimValue(c);
        if (c.classification === 'DEFEND') return sum + v * 0.05;
        if (c.classification === 'INVESTIGATE') return sum + v * 0.35;
        return sum + v * 0.65;
      }, 0)
    );
    var savings = Math.max(0, gross - netEstimate);

    var byJur = {};
    open.forEach(function (c) {
      var j = c.jurisdiction || 'england-wales';
      if (!byJur[j]) byJur[j] = { active: 0, defend: 0, new: 0, closed: 0, days: [] };
      byJur[j].active++;
      if (c.classification === 'DEFEND') byJur[j].defend++;
      byJur[j].days.push(c.cprDaysLeft != null ? 21 - (c.cprDaysLeft || 0) : 14);
    });
    closed.forEach(function (c) {
      var j = c.jurisdiction || 'england-wales';
      if (!byJur[j]) byJur[j] = { active: 0, defend: 0, new: 0, closed: 0, days: [] };
      byJur[j].closed++;
    });

    var by_jurisdiction = Object.keys(JUR_META)
      .map(function (j) {
        var row = byJur[j] || { active: 0, defend: 0, new: 0, closed: 0, days: [] };
        var avg =
          row.days.length > 0
            ? Math.round(row.days.reduce(function (a, b) {
                return a + b;
              }, 0) / row.days.length)
            : 0;
        return {
          name: JUR_META[j].name,
          code: JUR_META[j].code,
          active: row.active,
          new: Math.max(0, row.active - 2),
          closed: row.closed,
          avgDaysOpen: avg || 18,
          defendRate: row.active ? Math.round((100 * row.defend) / row.active) : 0,
        };
      })
      .filter(function (j) {
        return j.active > 0 || j.closed > 0;
      });

    var risk_register = open
      .filter(function (c) {
        return (c.cprDaysLeft || 99) <= 10 || c.classification === 'ESCALATE' || parseClaimValue(c) > 10000;
      })
      .sort(function (a, b) {
        return (a.cprDaysLeft || 99) - (b.cprDaysLeft || 99);
      })
      .slice(0, 8)
      .map(function (c) {
        return {
          ref: c.ref,
          claimant: c.claimant,
          issue:
            c.classification === 'ESCALATE'
              ? 'Escalated — senior review required'
              : (c.cprDaysLeft || 0) <= 3
                ? 'CPR deadline imminent'
                : 'High value or incomplete evidence',
          cprDaysLeft: c.cprDaysLeft || 0,
          value: c.value || '—',
          action:
            c.classification === 'ESCALATE'
              ? 'Review Montreal Convention exposure and evidence gaps'
              : (c.evidencePct || 0) < 70
                ? 'Complete gold evidence pack before drafting'
                : 'Proceed to drafting — response window closing',
        };
      });

    var key_legal_developments = knowledgeEntries
      .filter(function (e) {
        return e.impact === 'high' || e.actionRequired;
      })
      .slice(0, 5)
      .map(function (e) {
        return {
          title: e.title,
          impact: e.summary || e.actionNote || '',
        };
      });

    if (!key_legal_developments.length) {
      key_legal_developments.push({
        title: 'Portfolio computed from live case register',
        impact: open.length + ' active claims across ' + by_jurisdiction.length + ' jurisdictions.',
      });
    }

    return {
      reportId: 'LIT-REPORT-' + now.toISOString().slice(0, 7),
      reportMonth: monthLabel(now),
      generatedAt: now.toISOString(),
      generatedBy: 'DefendAble Platform — live portfolio engine',
      period: { from: now.toISOString().slice(0, 7) + '-01', to: now.toISOString().slice(0, 10) },
      executive_summary: {
        totalActive: open.length,
        newThisMonth: Math.max(0, open.length - closed.length),
        closedThisMonth: closed.length,
        totalExposureGross: gross,
        totalExposureNet: netEstimate,
        defendRate: open.length ? Math.round((100 * defend.length) / open.length) : 0,
        escalateCount: escalate.length,
        urgentCPR: urgent.length,
        savedVsSettled: savings,
      },
      financial_summary: {
        totalClaimedGross: gross,
        estimatedDefenceCost: Math.round(open.length * 850),
        projectedLiability: netEstimate,
        savingsVsFullSettlement: savings,
        avgCostPerCase: open.length ? Math.round(netEstimate / open.length) : 0,
        highValueCaseCount: open.filter(function (c) {
          return parseClaimValue(c) > 10000;
        }).length,
      },
      by_jurisdiction: by_jurisdiction,
      risk_register: risk_register,
      key_legal_developments: key_legal_developments,
      _caseCount: cases.length,
    };
  }

  global.ReportEngine = { build: build, parseClaimValue: parseClaimValue };
})(typeof window !== 'undefined' ? window : this);
