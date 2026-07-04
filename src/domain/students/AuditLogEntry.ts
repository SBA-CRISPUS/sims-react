export interface AuditLogEntry {
  id: string;
  action: string;
  studentNumber?: string;
  admissionId?: string;
  actorUid?: string;
  at?: Date;
}
