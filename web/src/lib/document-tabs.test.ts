import { describe, it, expect } from 'vitest';
import {
  getTabsForDocumentType,
  getTabsForDocument,
  documentTypeHasTabs,
  resolveTabLabels,
  documentTabConfigs,
  type DocumentResponse,
} from './document-tabs';

/**
 * Tests for document tab configuration and URL-driven tab state.
 *
 * These tests ensure the tab system works correctly for deep linking:
 * - URLs like /documents/:id/issues should show the Issues tab
 * - Invalid tabs should be detectable for redirect handling
 * - Document types without tabs should return empty configs
 */

describe('getTabsForDocumentType', () => {
  it('returns tabs for project documents', () => {
    const tabs = getTabsForDocumentType('project');
    expect(tabs.map(t => t.id)).toEqual(['issues', 'details', 'weeks', 'retro']);
  });

  it('returns tabs for program documents', () => {
    const tabs = getTabsForDocumentType('program');
    expect(tabs.map(t => t.id)).toEqual(['overview', 'issues', 'projects', 'weeks']);
  });

  it('returns empty array for wiki documents (no tabs)', () => {
    const tabs = getTabsForDocumentType('wiki');
    expect(tabs).toEqual([]);
  });

  it('returns empty array for issue documents (no tabs)', () => {
    const tabs = getTabsForDocumentType('issue');
    expect(tabs).toEqual([]);
  });

  it('returns default tabs for sprint documents', () => {
    const tabs = getTabsForDocumentType('sprint');
    expect(tabs.map(t => t.id)).toEqual(['overview', 'plan', 'review', 'standups']);
  });

  it('returns empty array for unknown document types', () => {
    const tabs = getTabsForDocumentType('unknown-type');
    expect(tabs).toEqual([]);
  });
});

describe('documentTypeHasTabs', () => {
  it('returns true for project documents', () => {
    expect(documentTypeHasTabs('project')).toBe(true);
  });

  it('returns true for program documents', () => {
    expect(documentTypeHasTabs('program')).toBe(true);
  });

  it('returns false for wiki documents', () => {
    expect(documentTypeHasTabs('wiki')).toBe(false);
  });

  it('returns false for issue documents', () => {
    expect(documentTypeHasTabs('issue')).toBe(false);
  });

  it('returns true for sprint documents', () => {
    expect(documentTypeHasTabs('sprint')).toBe(true);
  });

  it('returns false for unknown document types', () => {
    expect(documentTypeHasTabs('unknown-type')).toBe(false);
  });
});

describe('tab ID validation for URL deep linking', () => {
  /**
   * These tests verify the pattern used in UnifiedDocumentPage
   * for validating URL tab parameters against the config.
   */

  it('validates project tab IDs correctly', () => {
    const tabs = getTabsForDocumentType('project');
    const validTabIds = tabs.map(t => t.id);

    // Valid tab IDs
    expect(validTabIds).toEqual(['issues', 'details', 'weeks', 'retro']);

    // Invalid tab IDs (should trigger redirect in UnifiedDocumentPage)
    expect(validTabIds.includes('sprints')).toBe(false);
    expect(validTabIds.includes('invalid')).toBe(false);
    expect(validTabIds.includes('overview')).toBe(false); // overview is for programs
    expect(validTabIds.includes('')).toBe(false);
  });

  it('validates program tab IDs correctly', () => {
    const tabs = getTabsForDocumentType('program');
    const validTabIds = tabs.map(t => t.id);

    // Valid tab IDs
    expect(validTabIds).toEqual(['overview', 'issues', 'projects', 'weeks']);

    // Invalid tab IDs
    expect(validTabIds.includes('sprints')).toBe(false);
    expect(validTabIds.includes('details')).toBe(false); // details is for projects
    expect(validTabIds.includes('retro')).toBe(false); // retro is for projects
  });

  it('returns first tab as default for URL without tab', () => {
    // This tests the pattern: tabConfig[0]?.id || ''
    const projectTabs = getTabsForDocumentType('project');
    expect(projectTabs[0]?.id).toBe('issues');

    const programTabs = getTabsForDocumentType('program');
    expect(programTabs[0]?.id).toBe('overview');

    const sprintTabs = getTabsForDocumentType('sprint');
    expect(sprintTabs[0]?.id).toBe('overview');

    // Documents without tabs should have empty first tab
    const wikiTabs = getTabsForDocumentType('wiki');
    expect(wikiTabs[0]?.id).toBeUndefined();
  });

  it('returns status-aware sprint tabs for URL deep linking', () => {
    const planningSprint: DocumentResponse = {
      id: 'sprint-planning',
      title: 'Planning Sprint',
      document_type: 'sprint',
      properties: { status: 'planning' },
    };
    const activeSprint: DocumentResponse = {
      id: 'sprint-active',
      title: 'Active Sprint',
      document_type: 'sprint',
      properties: { status: 'active' },
    };
    const completedSprint: DocumentResponse = {
      id: 'sprint-completed',
      title: 'Completed Sprint',
      document_type: 'sprint',
      properties: { status: 'completed' },
    };

    expect(getTabsForDocument(planningSprint).map(t => t.id)).toEqual(['overview', 'plan']);
    expect(getTabsForDocument(activeSprint).map(t => t.id)).toEqual(['overview', 'issues', 'review', 'standups']);
    expect(getTabsForDocument(completedSprint).map(t => t.id)).toEqual(['overview', 'issues', 'review', 'standups']);
  });
});

describe('resolveTabLabels', () => {
  const mockDocument: DocumentResponse = {
    id: 'test-123',
    title: 'Test Document',
    document_type: 'project',
  };

  it('resolves static labels correctly', () => {
    const tabs = getTabsForDocumentType('project');
    const resolved = resolveTabLabels(tabs, mockDocument);

    const detailsTab = resolved.find(t => t.id === 'details');
    expect(detailsTab?.label).toBe('Details');

    const retroTab = resolved.find(t => t.id === 'retro');
    expect(retroTab?.label).toBe('Retro');
  });

  it('resolves dynamic labels with counts', () => {
    const projectTabs = getTabsForDocumentType('project');
    const resolvedProject = resolveTabLabels(projectTabs, mockDocument, { issues: 5, weeks: 3 });

    const issuesTab = resolvedProject.find(t => t.id === 'issues');
    expect(issuesTab?.label).toBe('Issues (5)');

    const projectWeeksTab = resolvedProject.find(t => t.id === 'weeks');
    expect(projectWeeksTab?.label).toBe('Weeks');

    const programDocument: DocumentResponse = { ...mockDocument, document_type: 'program' };
    const programTabs = getTabsForDocumentType('program');
    const resolvedProgram = resolveTabLabels(programTabs, programDocument, {
      issues: 5,
      projects: 2,
      weeks: 3,
    });

    expect(resolvedProgram.find(t => t.id === 'issues')?.label).toBe('Issues (5)');
    expect(resolvedProgram.find(t => t.id === 'projects')?.label).toBe('Projects (2)');
    expect(resolvedProgram.find(t => t.id === 'weeks')?.label).toBe('Weeks (3)');
  });

  it('resolves dynamic labels without counts', () => {
    const tabs = getTabsForDocumentType('project');
    const resolved = resolveTabLabels(tabs, mockDocument);

    const issuesTab = resolved.find(t => t.id === 'issues');
    expect(issuesTab?.label).toBe('Issues');

    const weeksTab = resolved.find(t => t.id === 'weeks');
    expect(weeksTab?.label).toBe('Weeks');
  });

  it('resolves dynamic labels with zero counts', () => {
    const tabs = getTabsForDocumentType('project');
    const resolved = resolveTabLabels(tabs, mockDocument, { issues: 0, weeks: 0 });

    // Zero should not show count (falsy check in label function)
    const issuesTab = resolved.find(t => t.id === 'issues');
    expect(issuesTab?.label).toBe('Issues');
  });
});

describe('documentTabConfigs structure', () => {
  it('has configs for expected document types', () => {
    expect(documentTabConfigs).toHaveProperty('project');
    expect(documentTabConfigs).toHaveProperty('program');
    expect(documentTabConfigs).toHaveProperty('sprint');
    expect(documentTabConfigs).toHaveProperty('issue');
    expect(documentTabConfigs).toHaveProperty('wiki');
  });

  it('each tab has required properties', () => {
    for (const [docType, tabs] of Object.entries(documentTabConfigs)) {
      for (const tab of tabs) {
        expect(tab).toHaveProperty('id');
        expect(tab).toHaveProperty('label');
        expect(tab).toHaveProperty('component');
        expect(typeof tab.id).toBe('string');
        expect(tab.id.length).toBeGreaterThan(0);
      }
    }
  });

  it('tab IDs are unique within each document type', () => {
    for (const [docType, tabs] of Object.entries(documentTabConfigs)) {
      const ids = tabs.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    }
  });
});
