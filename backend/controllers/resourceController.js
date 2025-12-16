const { TeamMember, ResourceAllocation, User, Project, Task } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// Team Members
const getTeamMembers = async (req, res, next) => {
  try {
    const members = await TeamMember.findAll({
      where: { project_id: req.params.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] }]
    });
    
    // Format the response to include full name
    const formattedMembers = members.map(member => ({
      ...member.toJSON(),
      user: member.user ? {
        id: member.user.id,
        name: `${member.user.first_name || ''} ${member.user.last_name || ''}`.trim() || member.user.email,
        email: member.user.email
      } : null
    }));
    
    res.status(200).json({ success: true, data: formattedMembers });
  } catch (error) {
    next(error);
  }
};

const createTeamMember = async (req, res, next) => {
  try {
    const member = await TeamMember.create({ project_id: req.params.id, ...req.body });
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
};

const updateTeamMember = async (req, res, next) => {
  try {
    const member = await TeamMember.findByPk(req.params.memberId);
    if (!member) return next(new AppError('Team member not found', 404));
    await member.update(req.body);
    res.status(200).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
};

const deleteTeamMember = async (req, res, next) => {
  try {
    const member = await TeamMember.findByPk(req.params.memberId);
    if (!member) return next(new AppError('Team member not found', 404));
    await member.destroy();
    res.status(200).json({ success: true, message: 'Team member removed' });
  } catch (error) {
    next(error);
  }
};

// Resource Allocations
const getAllocations = async (req, res, next) => {
  try {
    const allocations = await ResourceAllocation.findAll({
      where: { project_id: req.params.id },
      include: [
        { 
          model: TeamMember, 
          as: 'teamMember', 
          include: [{ 
            model: User, 
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }] 
        },
        { model: Task, as: 'task' }
      ]
    });
    
    // Format the response to include full name
    const formattedAllocations = allocations.map(allocation => {
      const allocationData = allocation.toJSON();
      if (allocationData.teamMember && allocationData.teamMember.user) {
        allocationData.teamMember.user.name = `${allocationData.teamMember.user.first_name || ''} ${allocationData.teamMember.user.last_name || ''}`.trim() || allocationData.teamMember.user.email;
      }
      return allocationData;
    });
    
    res.status(200).json({ success: true, data: formattedAllocations });
  } catch (error) {
    next(error);
  }
};

const createAllocation = async (req, res, next) => {
  try {
    const allocation = await ResourceAllocation.create({ project_id: req.params.id, ...req.body });
    res.status(201).json({ success: true, data: allocation });
  } catch (error) {
    next(error);
  }
};

const updateAllocation = async (req, res, next) => {
  try {
    const allocation = await ResourceAllocation.findByPk(req.params.allocationId);
    if (!allocation) return next(new AppError('Allocation not found', 404));
    await allocation.update(req.body);
    res.status(200).json({ success: true, data: allocation });
  } catch (error) {
    next(error);
  }
};

const deleteAllocation = async (req, res, next) => {
  try {
    const allocation = await ResourceAllocation.findByPk(req.params.allocationId);
    if (!allocation) return next(new AppError('Allocation not found', 404));
    await allocation.destroy();
    res.status(200).json({ success: true, message: 'Allocation deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getAllocations,
  createAllocation,
  updateAllocation,
  deleteAllocation
};
