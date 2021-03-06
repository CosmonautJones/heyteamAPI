const request = require('request');

const Workspace = require('../models/workspaceModel');

const createWorkspace = require('./helpers/createWorkspace');

const colors = require('colors');

const login = (req, res) => {
  if (!req.query.code) {
    // access denied

    return;
  }
  var data = {
    form: {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uri: process.env.REDIRECT_AUTH,
      code: req.query.code,
    },
  };
  // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>');
  // console.log(data);
  // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>');
  request.post('https://slack.com/api/oauth.access', data, function(
    error,
    response,
    body
  ) {
    // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>');
    // console.log(error, response.statusCode);
    // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>');
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);
      console.log(body.team_id);
      Workspace.findOne({
        'info.id': body.team_id,
      })
        .then(workspace => {
          if (workspace) {
            console.log('workspace exists');
            return res.redirect(
              `${process.env.REDIRECT_URI}/?doc_id=${workspace._id}`
            );
          } else {
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>');
            console.log('creating workspace');
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>');
            createWorkspace(body, req, res);
          }
        })
        .catch(error => {
          console.log('you have a big error:', error);
        });
    }
  });
};

const addBot = (req, res) => {
  if (!req.query.code) {
    // access denied
    return;
  }
  var data = {
    form: {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uri: process.env.REDIRECT_BOT,
      code: req.query.code,
    },
  };
  request.post('https://slack.com/api/oauth.access', data, async function(
    error,
    response,
    body
  ) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);
      console.log(body);
      const workspace = await Workspace.findOne({ 'info.id': body.team_id });
      await Workspace.findOneAndUpdate({
        'info.id': body.team_id,
        $set: {
          bot: {
            access_token: body.access_token,
            user_id: body.user_id,
            team_name: body.team_name,
            team_id: body.team_id,
            bot_user_id: body.bot.bot_user_id,
            bot_access_token: body.bot.bot_access_token,
          },
        },
      })
        .then(() => {
          return res.redirect(
            `${process.env.REDIRECT_URI}/?doc_id=${workspace._id}`
          );
        })
        .catch(console.error);
    }
  });
};

const getAllMembers = async (req, res) => {
  const { w_id } = req.body;
  const workspace = await Workspace.findById(w_id).populate('members');
  res.json(workspace.members);
};

const findMembers = async (req, res) => {
  // console.log('trying to find member by ', req.body.searchTerm);
  const { w_id, searchTerm } = req.body;
  console.log(w_id, searchTerm);
  const regex = new RegExp(`${searchTerm}`, 'i');
  const searchResult = [];

  const workspace = await Workspace.findById(w_id).populate('members');
  workspace.members.forEach(m => {
    if (m.real_name) {
      if (m.real_name.match(regex)) {
        const memberShort = {
          id: m.id,
          image: m.image,
          color: m.color,
          title: m.real_name,
          real_name: m.real_name,
          description: m.name,
        };
        searchResult.push(memberShort);
      }
    }
  });
  // console.log(searchResult);
  res.json(searchResult);
};

const findMemberBySlackId = async (req, res) => {
  console.log('find member by slack id');
  const { w_id, u_id } = req.body;
  console.log(u_id);
  let member = 'No Member Found';
  const workspace = await Workspace.findById(w_id).populate('members');
  workspace.members.forEach(m => {
    if (m.id === u_id) {
      member = {
        id: m.id,
        image: m.image,
        color: m.color,
        title: m.real_name,
        real_name: m.real_name,
        description: m.name,
      };
      return;
    }
  });
  res.send(member);
};

const hasActiveSubstription = async (req, res) => {
  const { w_id } = req.body;
  const workspace = await Workspace.findById(w_id);
  res.send(workspace.info.active);
};

module.exports = {
  login,
  addBot,
  getAllMembers,
  findMembers,
  hasActiveSubstription,
  findMemberBySlackId,
};
