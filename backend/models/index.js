const { sequelize } = require('../config/database');
const User = require('./User');

// Quote Tracker Models
const Client = require('./Client');
const Quote = require('./Quote');
const QuoteMilestone = require('./QuoteMilestone');
const QuoteMilestoneTracking = require('./QuoteMilestoneTracking');
const QuoteAction = require('./QuoteAction');
const QuoteDocument = require('./QuoteDocument');
const QuoteActivityLog = require('./QuoteActivityLog');

// Personal Task Management
const PersonalTask = require('./PersonalTask');

// Quality Test Entry Models
const TestCategory = require('./TestCategory');
const TestDefinition = require('./TestDefinition');
const TestSession = require('./TestSession');
const TestEntry = require('./TestEntry');
const SampleCard = require('./SampleCard');
const TestEntryMetadata = require('./TestEntryMetadata');
const KpiConfig = require('./KpiConfig');
const RagDocument = require('./RagDocument');
const KappaStudy = require('./KappaStudy');
const KappaRating = require('./KappaRating');
const Job = require('./Job');
const AdhesionLog = require('./AdhesionLog');

// ==========================================
// Quote Tracker Associations
// ==========================================

Client.hasMany(Quote, { foreignKey: 'client_id', as: 'quotes' });
Quote.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

User.hasMany(Quote, { foreignKey: 'assigned_to', as: 'assignedQuotes' });
Quote.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });

User.hasMany(Quote, { foreignKey: 'created_by', as: 'createdQuotes' });
Quote.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Quote.belongsTo(QuoteMilestone, { foreignKey: 'current_milestone_id', as: 'currentMilestone' });

Quote.hasMany(QuoteMilestoneTracking, { foreignKey: 'quote_id', as: 'milestoneTracking' });
QuoteMilestoneTracking.belongsTo(Quote, { foreignKey: 'quote_id', as: 'quote' });

QuoteMilestone.hasMany(QuoteMilestoneTracking, { foreignKey: 'milestone_id', as: 'tracking' });
QuoteMilestoneTracking.belongsTo(QuoteMilestone, { foreignKey: 'milestone_id', as: 'milestone' });

User.hasMany(QuoteMilestoneTracking, { foreignKey: 'assigned_to', as: 'assignedMilestones' });
QuoteMilestoneTracking.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });

Quote.hasMany(QuoteAction, { foreignKey: 'quote_id', as: 'actions' });
QuoteAction.belongsTo(Quote, { foreignKey: 'quote_id', as: 'quote' });

User.hasMany(QuoteAction, { foreignKey: 'assigned_to', as: 'assignedQuoteActions' });
QuoteAction.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });

User.hasMany(QuoteAction, { foreignKey: 'created_by', as: 'createdQuoteActions' });
QuoteAction.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Quote.hasMany(QuoteDocument, { foreignKey: 'quote_id', as: 'documents' });
QuoteDocument.belongsTo(Quote, { foreignKey: 'quote_id', as: 'quote' });

User.hasMany(QuoteDocument, { foreignKey: 'uploaded_by', as: 'uploadedQuoteDocuments' });
QuoteDocument.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

Quote.hasMany(QuoteActivityLog, { foreignKey: 'quote_id', as: 'activityLog' });
QuoteActivityLog.belongsTo(Quote, { foreignKey: 'quote_id', as: 'quote' });

User.hasMany(QuoteActivityLog, { foreignKey: 'user_id', as: 'quoteActivities' });
QuoteActivityLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ==========================================
// Personal Task Management
// ==========================================

User.hasMany(PersonalTask, { foreignKey: 'user_id', as: 'personalTasks' });
PersonalTask.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ==========================================
// Quality Test Entry Associations
// ==========================================

TestCategory.hasMany(TestDefinition, { foreignKey: 'category_id', as: 'definitions' });
TestDefinition.belongsTo(TestCategory, { foreignKey: 'category_id', as: 'category' });

Job.hasMany(TestSession, { foreignKey: 'job_id', as: 'sessions' });
TestSession.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

User.hasMany(TestSession, { foreignKey: 'inspector_id', as: 'inspectedSessions' });
TestSession.belongsTo(User, { foreignKey: 'inspector_id', as: 'inspector' });

User.hasMany(TestSession, { foreignKey: 'approved_by', as: 'approvedTestSessions' });
TestSession.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

TestSession.hasMany(TestEntry, { foreignKey: 'session_id', as: 'entries' });
TestEntry.belongsTo(TestSession, { foreignKey: 'session_id', as: 'session' });

TestDefinition.hasMany(TestEntry, { foreignKey: 'test_definition_id', as: 'entries' });
TestEntry.belongsTo(TestDefinition, { foreignKey: 'test_definition_id', as: 'definition' });

TestSession.hasMany(SampleCard, { foreignKey: 'session_id', as: 'sampleCards' });
SampleCard.belongsTo(TestSession, { foreignKey: 'session_id', as: 'session' });

SampleCard.hasMany(TestEntry, { foreignKey: 'sample_card_id', as: 'entries' });
TestEntry.belongsTo(SampleCard, { foreignKey: 'sample_card_id', as: 'sampleCard' });

TestSession.hasMany(TestEntryMetadata, { foreignKey: 'session_id', as: 'entryMetadata' });
TestEntryMetadata.belongsTo(TestSession, { foreignKey: 'session_id', as: 'session' });

TestDefinition.hasMany(TestEntryMetadata, { foreignKey: 'test_definition_id', as: 'entryMetadata' });
TestEntryMetadata.belongsTo(TestDefinition, { foreignKey: 'test_definition_id', as: 'definition' });

// ==========================================
// Kappa / Attribute Agreement Analysis
// ==========================================

User.hasMany(KappaStudy, { foreignKey: 'created_by', as: 'createdKappaStudies' });
KappaStudy.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

User.hasMany(KappaStudy, { foreignKey: 'master_appraiser_id', as: 'masterAppraisedStudies' });
KappaStudy.belongsTo(User, { foreignKey: 'master_appraiser_id', as: 'masterAppraiser' });

TestDefinition.hasMany(KappaStudy, { foreignKey: 'test_definition_id', as: 'kappaStudies' });
KappaStudy.belongsTo(TestDefinition, { foreignKey: 'test_definition_id', as: 'testDefinition' });

TestCategory.hasMany(KappaStudy, { foreignKey: 'category_id', as: 'kappaStudies' });
KappaStudy.belongsTo(TestCategory, { foreignKey: 'category_id', as: 'category' });

KappaStudy.hasMany(KappaRating, { foreignKey: 'study_id', as: 'ratings' });
KappaRating.belongsTo(KappaStudy, { foreignKey: 'study_id', as: 'study' });

User.hasMany(KappaRating, { foreignKey: 'appraiser_id', as: 'kappaRatings' });
KappaRating.belongsTo(User, { foreignKey: 'appraiser_id', as: 'appraiser' });

// ==========================================
// Sync
// ==========================================

const syncModels = async () => {
  try {
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      console.log('✅ Models synchronized with database');
    }
  } catch (error) {
    console.error('❌ Error synchronizing models:', error);
  }
};

module.exports = {
  sequelize,
  User,

  // Quote Tracker
  Client,
  Quote,
  QuoteMilestone,
  QuoteMilestoneTracking,
  QuoteAction,
  QuoteDocument,
  QuoteActivityLog,

  // Personal Tasks
  PersonalTask,

  // Quality Test Entry
  TestCategory,
  TestDefinition,
  TestSession,
  TestEntry,
  SampleCard,
  TestEntryMetadata,
  KpiConfig,

  // RAG Knowledge Base
  RagDocument,

  // Kappa / MSA
  KappaStudy,
  KappaRating,

  // Job Tracking
  Job,

  // ==========================================
  // Adhesion Log
  // ==========================================
  AdhesionLog,

  syncModels
};
