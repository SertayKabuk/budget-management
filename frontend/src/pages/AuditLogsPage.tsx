import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { auditApi, groupApi } from '../services/api';
import type { AuditLog, Group, GroupMember } from '../types';

const AuditLogsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [groups, setGroups] = useState<Group[]>([]);
  const [userGroupMemberships, setUserGroupMemberships] = useState<string[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const isGlobalAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (groups.length > 0 || isGlobalAdmin) {
      fetchAuditLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup, selectedAction, selectedEntityType, groups, isGlobalAdmin]);

  const fetchGroups = async () => {
    try {
      const response = await groupApi.getAll();
      const allGroups = response.data;
      setGroups(allGroups);

      // If not global admin, fetch user's group memberships
      if (!isGlobalAdmin && user?.id) {
        const adminGroups: string[] = [];
        
        // Check each group for admin membership
        for (const group of allGroups) {
          try {
            const membersResponse = await groupApi.getMembers(group.id);
            const members = membersResponse.data;
            const userMembership = members.find((m: GroupMember) => m.userId === user.id);
            if (userMembership && userMembership.role === 'admin') {
              adminGroups.push(group.id);
            }
          } catch (err) {
            console.error(`Error fetching members for group ${group.id}:`, err);
          }
        }
        
        setUserGroupMemberships(adminGroups);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load groups');
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        limit: 200,
      };

      if (selectedAction !== 'all') {
        params.action = selectedAction;
      }

      if (selectedEntityType !== 'all') {
        params.entityType = selectedEntityType;
      }

      const response = await auditApi.getAll(params);
      let logs = response.data;

      // Filter by group if not global admin
      if (!isGlobalAdmin) {
        if (selectedGroup === 'all') {
          // Show logs for all groups where user is admin
          logs = logs.filter(log => {
            if (log.entityType === 'Group') {
              return userGroupMemberships.includes(log.entityId);
            }
            if (log.entityType === 'Expense' || log.entityType === 'GroupMember') {
              // Check if the expense/member belongs to a group the user is admin of
              const groupId = (log.newValues?.groupId || log.oldValues?.groupId) as string | undefined;
              return groupId && userGroupMemberships.includes(groupId);
            }
            return false;
          });
        } else {
          // Filter for specific group
          logs = logs.filter(log => {
            if (log.entityType === 'Group') {
              return log.entityId === selectedGroup;
            }
            if (log.entityType === 'Expense' || log.entityType === 'GroupMember') {
              const groupId = log.newValues?.groupId || log.oldValues?.groupId;
              return groupId === selectedGroup;
            }
            return false;
          });
        }
      } else if (selectedGroup !== 'all') {
        // Global admin filtering by specific group
        logs = logs.filter(log => {
          if (log.entityType === 'Group') {
            return log.entityId === selectedGroup;
          }
          if (log.entityType === 'Expense' || log.entityType === 'GroupMember') {
            const groupId = log.newValues?.groupId || log.oldValues?.groupId;
            return groupId === selectedGroup;
          }
          return false;
        });
      }

      setAuditLogs(logs);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionLabel = (action: string) => {
    const actionKey = action as keyof typeof t.auditLogs.actions;
    return t.auditLogs.actions[actionKey] || action;
  };

  const getEntityTypeLabel = (entityType: string) => {
    const entityKey = entityType as keyof typeof t.auditLogs.entityTypes;
    return t.auditLogs.entityTypes[entityKey] || entityType;
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const renderChanges = (log: AuditLog) => {
    if (!log.oldValues || !log.newValues) return null;

    const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
    const oldObj = log.oldValues as Record<string, unknown>;
    const newObj = log.newValues as Record<string, unknown>;

    Object.keys(newObj).forEach(key => {
      if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        changes.push({
          field: key,
          oldValue: oldObj[key],
          newValue: newObj[key],
        });
      }
    });

    if (changes.length === 0) return null;

    return (
      <div className="mt-2 space-y-2">
        {changes.map((change, idx) => (
          <div key={idx} className="bg-gray-50 p-2 rounded text-sm">
            <div className="font-semibold text-gray-700">{change.field}</div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <span className="text-red-600 font-medium">{t.auditLogs.table.oldValue}: </span>
                <span className="text-gray-600">{formatValue(change.oldValue)}</span>
              </div>
              <div>
                <span className="text-green-600 font-medium">{t.auditLogs.table.newValue}: </span>
                <span className="text-gray-600">{formatValue(change.newValue)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const toggleExpand = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  // Filter groups based on user permissions
  const availableGroups = isGlobalAdmin 
    ? groups 
    : groups.filter(g => userGroupMemberships.includes(g.id));

  if (!isGlobalAdmin && userGroupMemberships.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">{t.auditLogs.accessDenied}</h2>
            <p className="text-yellow-700">
              {t.auditLogs.accessDeniedMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.auditLogs.title}</h1>
          <p className="text-gray-600">
            {isGlobalAdmin 
              ? t.auditLogs.subtitleAdmin
              : t.auditLogs.subtitle}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.auditLogs.filters.group}
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t.auditLogs.filters.allGroups}</option>
                {availableGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.auditLogs.filters.action}
              </label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t.auditLogs.filters.allActions}</option>
                <option value="CREATE">{t.auditLogs.actions.CREATE}</option>
                <option value="UPDATE">{t.auditLogs.actions.UPDATE}</option>
                <option value="DELETE">{t.auditLogs.actions.DELETE}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.auditLogs.filters.entityType}
              </label>
              <select
                value={selectedEntityType}
                onChange={(e) => setSelectedEntityType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t.auditLogs.filters.allTypes}</option>
                <option value="User">{t.auditLogs.entityTypes.User}</option>
                <option value="Group">{t.auditLogs.entityTypes.Group}</option>
                <option value="GroupMember">{t.auditLogs.entityTypes.GroupMember}</option>
                <option value="Expense">{t.auditLogs.entityTypes.Expense}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audit Logs List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t.auditLogs.loading}</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">{error}</p>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600">{t.auditLogs.noResults}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.auditLogs.table.timestamp}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.auditLogs.table.action}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.auditLogs.table.entityType}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.auditLogs.table.user}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.auditLogs.table.details}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(log.id)}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                            {getActionLabel(log.action)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getEntityTypeLabel(log.entityType)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.userName || t.auditLogs.table.system}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <button className="text-blue-600 hover:text-blue-800">
                            {expandedLog === log.id ? t.auditLogs.table.hideDetails : t.auditLogs.table.showDetails}
                          </button>
                        </td>
                      </tr>
                      {expandedLog === log.id && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-semibold text-gray-700">{t.auditLogs.table.entityId}:</span>
                                  <span className="ml-2 text-gray-600 font-mono">{log.entityId}</span>
                                </div>
                                {log.ipAddress && (
                                  <div>
                                    <span className="font-semibold text-gray-700">{t.auditLogs.table.ipAddress}:</span>
                                    <span className="ml-2 text-gray-600">{log.ipAddress}</span>
                                  </div>
                                )}
                              </div>
                              
                              {log.action === 'UPDATE' && renderChanges(log)}
                              
                              {log.action === 'CREATE' && log.newValues && (
                                <div className="bg-green-50 p-4 rounded">
                                  <div className="font-semibold text-green-800 mb-2">{t.auditLogs.table.createdValues}:</div>
                                  <pre className="text-xs text-gray-700 overflow-x-auto">
                                    {JSON.stringify(log.newValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                              
                              {log.action === 'DELETE' && log.oldValues && (
                                <div className="bg-red-50 p-4 rounded">
                                  <div className="font-semibold text-red-800 mb-2">{t.auditLogs.table.deletedValues}:</div>
                                  <pre className="text-xs text-gray-700 overflow-x-auto">
                                    {JSON.stringify(log.oldValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;
