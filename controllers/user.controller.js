const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
var generator = require('generate-password');
const converter = require('../util/converter');
const sendMail = require('../services/mailer');
const sequelize = require('../database/connection');
const { Op } = require('sequelize');
const VolunteerPanel = require('../models/voluteerpanel.model');

/**
 *@returns Array<{officerID, name, role, stationID, stationName, location, type, contactNo}>
 */
exports.getUsers = async (req, res) => {
	let users = [];
	try {
		users = await User.findAll({
			where: {
				role: {
					[Op.or]: ['admin', 'Volunteer'],
				},
			},
			attributes: { exclude: 'password' },
		});
		users = users.map((item) => converter(item.dataValues));
		return res.status(200).send(users);
	} catch (e) {
		return res.status(400).send(e.message);
	}
};

/**
 *@returns Array<{officerID, name, role, stationID, stationName, location, type, contactNo}>
 */
exports.getUser = async (req, res) => {
	let user = {};
	try {
		user = await User.findOne({ where: { id: req.params.id }, attributes: { exclude: 'password' } });
		if (user.hasOwnProperty('dataValues')) {
			user = converter(user.dataValues);
		}
		return res.status(200).send(user);
	} catch (e) {
		return res.status(400).send(e.message);
	}
};

/**
 *@returns Array<{officerID, name, role, stationID, stationName, location, type, contactNo}>
 */
exports.getVolunteers = async (req, res) => {
	let users = [];
	try {
		users = await User.findAll({ where: { role: 'Volunteer' }, attributes: { exclude: 'password' } });
		users = users.map((item) => converter(item.dataValues));
		return res.status(200).send(users);
	} catch (e) {
		return res.status(400).send(e.message);
	}
};

/**
 */
exports.getVolunteerOfPanel = async (req, res) => {
	let volunteer = {};
	try {
		volunteer = await VolunteerPanel.findOne({
			where: { panelID: req.params.panelID },
			include: { model: User, attributes: { exclude: 'password' } },
		});
		if (volunteer.hasOwnProperty('dataValues')) {
			volunteer = converter(volunteer.dataValues);
		}
		return res.status(200).send(volunteer);
	} catch (e) {
		return res.status(400).send(e.message);
	}
};

/**
 * @description Auto generates a password and send it to users mail
 *@returns Object
 */
exports.createUser = async (req, res) => {
	let user = req.body;
	let t = await sequelize.transaction();
	try {
		let password = generator.generate({
			length: 10,
			numbers: true,
		});
		let salt = await bcrypt.genSalt(10);
		user.password = await bcrypt.hash(password, salt);
		user = await User.create(user, { transaction: t });
		if (user.hasOwnProperty('dataValues')) {
			user = converter(user.dataValues);
		}
		sendMail('IEEE Mock Interview Account', password,"isuruariyarathne97@gmail.com" , { email: "isuruariyarathne97@gmail.com", password: password });
		await t.commit();
		delete user.password;
		let io = req.app.get('socket');
		io.in('admin').emit('user', 'post', user);
		return res.status(200).send({ ...user, password: password });
	} catch (e) {
		await t.rollback();
		return res.status(400).send({ status: 400, message: e.message });
	}
};

/**
 * @param {Object} req: req.body: Any attribute excluding password
 *@returns Object{officerID, name, role, stationID, stationName, location, type, contactNo}
 */

exports.updateUser = async (req, res) => {
	let user = {};
	try {
		user = await User.update({ ...req.body }, { where: { id: req.params.id }, returning: true });
		user = await User.findOne({ attributes: { exclude: 'password' }, where: { id: req.params.id } });
		if (user.hasOwnProperty('dataValues')) {
			user = converter(user.dataValues);
		}
		let io = req.app.get('socket');
		io.in('admin').emit('user', 'put', user);
		return res.status(200).send(user);
	} catch (e) {
		return res.status(400).send(e.message);
	}
};
/**
 * @returns success or error message
 */
exports.deleteUser = async (req, res) => {
	try {
		await User.destroy({ where: { id: req.params.id } });
		let io = req.app.get('socket');
		io.in('admin').emit('user', 'delete', { id: req.params.id });
		return res.status(200).send('User succesfully deleted');
	} catch (e) {
		return res.status(400).send(e.message);
	}
};

/**

/**
 * @returns success or error message 
 */
exports.changePassword = async (req, res) => {
	let password = req.body.newPassword;
	let confirmPassword = req.body.confirmNewPassword;
	if (password != confirmPassword) {
		return res.status(400).send('Passwords dont match');
	}
	let salt = await bcrypt.genSalt(10);
	password = await bcrypt.hash(password, salt);
	try {
		user = await User.update({ password: password }, { where: { id: req.params.id } });
		user = await User.findOne({ where: { id: req.params.id } });
		return res.status(200).send('Password succesfully changed');
	} catch (e) {
		return res.status(400).send(e.message);
	}
};
