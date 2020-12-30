import jwt from "jsonwebtoken";
import bcrypt, { hash } from "bcrypt";
import User from "../models/UserModel";
import UserProfile from "../models/User_ProfileModel";
import _, { identity } from "lodash";
import console from "console";
import Tournament from "../models/TournamentModel";
import TournamentRules from "../models/TournamentRulesModel";
import ItournamentRules from "../models/interfaces/TournamentRulesInterface";
import TournamentReport from "../models/TournamentReportModel";

require("dotenv").config();




//

class UserController {
  static async signup(req, res, next) {
    const { username, email, password } = req.body;
    try {
      const emailCheck = await User.findOne({ email });
      const usernameCheck = await User.findOne({ username });
      if (email && username && password) {
        if (email.includes("@") === true) {
          if (emailCheck) {
            next({ name: "EMAIL_EXIST" });
          } else {
            if (usernameCheck) {
              next({ name: "USERNAME_EXIST" });
            } else {
              const user = new User({
                username,
                email,
                password,
              });
              user.save();
              next();
            }
          }
        } else {
          next({ name: "EMAIL_NOT_VALID" });
        }
      } else {
        next({ name: "FIELD_BLANK" });
      }
    } catch {
      next({ name: "FIELD_BLANK" });
    }
  }

  static async limiter(req, res, next) {
    const maxWrongAttemptsByIPperDay = 100;
    const maxConsecutiveFailsByUsernameAndIP = 5;



  

    const getUsernameIPkey = (username, ip) => `${username}_${ip}`;
  }

  static async signin(req, res, next) {
    const { email, username, password, verifyingToken } = req.body;
    try {
      const Check: any = await User.findOne({ $or: [{ email }, { username }] });
      const Pass: any = await bcrypt.compare(password, Check?.password);
      const Profile: any = await UserProfile.findOne({ _userId: Check._id });

      if (Check && Pass) {
        if (Check.role === "unregistered") {
          return res.status(201).json({
            success: true,
            message: "verify first",
            role: `${Check.role}`,
          });
        } else {
          const secret_key: any = process.env.JWT_Accesstoken;
          const access_token: any = await jwt.sign(
            { _id: Check._id, role: Check.role },
            secret_key
          );
          res.status(201).json({
            success: true,
            message: `${username || email} has successfully login`,
            access_token,
            role: `${Check.role}`,
          });
        }
      } else {
        next({ name: "NOT_FOUND" });
      }
    } catch {
      next({ name: "NOT_FOUND" });
    }
  }

  static async confirmUser(req, res, next) {
    const { verifyingToken } = req.body;

    try {
      const secret: any = process.env.JWT_Activate;
      await jwt.verify(verifyingToken, secret, async (err, decoded) => {
        if (!decoded) {
          next({ name: "INVALID_TOKEN" });
        } else {
          const email = decoded.email;
          const Found: any = await User.findOne({
            email,
          });
          const secret_key: any = process.env.JWT_Accesstoken;
          const access_token: any = jwt.sign({ _id: Found._id }, secret_key);
          const response = res.status(201).json({
            success: true,
            message: `${email} has successfully login`,
            access_token,
            role: `${Found.role}`,
          });
          if (Found.role === "unregistered") {
            await User.findOneAndUpdate({ email }, { $set: { role: "user" } });
            return response;
          } else {
            response;
          }
        }
      });
    } catch {
      next({ name: "INVALID_TOKEN" });
    }
  }

  static async proceed_signin(req, res, next) {
    const { email, username } = req.body;
    const Found: any = await User.findOne({ $or: [{ email }, { username }] });
    const secret_key: any = process.env.JWT_Accesstoken;
    const access_token: any = jwt.sign({ _id: Found._id }, secret_key);
    const response = res.status(201).json({
      success: true,
      message: `${username || email} has successfully login`,
      access_token,
      role: `${Found.role}`,
    });
    if (Found.role === "unregistered") {
      await User.findOneAndUpdate(
        { $or: [{ email }, { username }] },
        { $set: { role: "user" } }
      );
      return response;
    } else {
      response;
    }
  }

  static async forgotPassword(req, res, next) {
    const { email } = req.body;
    const Check: any = await User.findOne({ email });

    if (Check) {
      next();
    } else {
      next({ name: "USER_NOT_FOUND" });
    }
  }

  static resetPassword(req, res, next) {
    const { resetLink, newPassword, email } = req.body;

    try {
      if (resetLink) {
        const jwtforgottoken: any = process.env.JWT_ForgotPassword;
        jwt.verify(resetLink, jwtforgottoken, function (error, decodedData) {
          if (decodedData.email == email) {
            if (error) {
              next({ name: "INVALID_TOKEN" });
            } else {
              User.findOne({ resetLink }, (err, user) => {
                if (err || !user) {
                  next({ name: "NOT_FOUND" });
                } else {
                  const salt = bcrypt.genSaltSync(10);
                  const password = bcrypt.hashSync(newPassword, salt);
                  return User.findOneAndUpdate(
                    { resetLink },
                    { $set: { password } }
                  )
                    .then(() => {
                      if (err) {
                        next({ name: "INVALID_TOKEN" });
                      } else {
                        User.findOneAndUpdate(
                          { email },
                          { $set: { resetLink: null } }
                        ).then(() => {
                          res.status(200).json({
                            success: true,
                            message: `Password successfully changed`,
                          });
                        });
                      }
                    })
                    .catch(next);
                }
              });
            }
          } else {
            next({ name: "INVALID_TOKEN" });
          }
        });
      } else {
        next({ name: "INVALID_TOKEN" });
      }
    } catch {
      next({ name: "INVALID_TOKEN" });
    }
  }

  static async tournamentAvailable(req, res, next) {
    const tournament: any = await Tournament.find().exec();
    const newTournament = await tournament.map(async (tournaments, index) => {
      const rules = await TournamentRules.findOne({
        _id: tournaments._tournamentRulesId,
      }).exec();
      return { id: tournaments._id, rules: rules?.maxParticipant };
    });

    Promise.all(newTournament).then((results) => {
      const data = results.map(async (data: any, index) => {
        const _id = data.id;
        const report = await TournamentReport.findOne({
          _tournamentId: data.id,
        });
        const participant: any = report?.participant;
        const tourn = await Tournament.findOne({ _id: data.id });

        if (data.rules <= participant.length) {
          return { status: 1, message: "tidak tersedia", data: tourn };
        } else {
          return { status: 0, message: "tersedia", data: tourn };
        }
      });

      Promise.all(data).then((result) => {
        res.status(200).send(result);
      });
    });
  }

  static async seeTournamentList(req, res, next) {
    const { page = 1, limit = 10, q = "" } = req.query;
    try {
      const tournament: any = await Tournament.find({
        tournamentName: { $regex: q, $options: "i" },
      })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();
      const nextpage = parseInt(page) + parseInt("1");
      const previouspage = parseInt(page) - parseInt("1");
      const jumlahData = await Tournament.countDocuments({
        tournamentName: { $regex: q, $options: "i" },
      });
      const jumlahpage = Math.ceil(jumlahData / limit);
      console.log(jumlahpage);
      var npg, ppg;
      if (parseInt(page) === jumlahpage && parseInt(page) === 1) {
        npg = null;
        ppg = null;
      } else if (parseInt(page) === jumlahpage) {
        ppg = "http://localhost:5000/tournaments?page=" + previouspage;
        npg = null;
      } else if (parseInt(page) === 1) {
        npg = "http://localhost:5000/tournaments?page=" + nextpage;
        ppg = null;
      } else {
        npg = "http://localhost:5000/tournaments?page=" + nextpage;
        ppg = "http://localhost:5000/tournaments?page=" + previouspage;
      }
      res.status(200).send({
        tournament,
        page: page,
        totalPage: jumlahpage,
        nexpages: npg,
        previousPage: ppg,
      });
    } catch (error) {
      console.error(error.message);
    }
  }

  static async seeTournamentDetail(req, res, next) {
    const { id } = req.params;
    const tournament = await Tournament.findById(id);
    const participant = await TournamentReport.findOne({
      _tournamentId: id,
    });
    const part: any = participant?.participant.length;
    const rules = await TournamentRules.findOne({
      _id: tournament?._tournamentRulesId,
    });
    const max: any = rules?.maxParticipant;
    const booked = parseInt(part) + "/" + parseInt(max);
    res.status(200).send({
      StartDate: tournament?.tournamentOpen,
      EndDate: tournament?.tournamentClose,
      participant: participant?.participant,
      by: rules?.subdistrict,
      maximumage: rules?.age,
      slot: booked,
    });
  }

  static async seeHallOfFame(req, res, next) {
    const FFA: any = await Tournament.find({
      finished: true,
      tournamentType: "freeforall",
    });
    console.log(FFA);
    const BRANCHES: any = await Tournament.find({
      finished: true,
      tournamentType: "branches",
    });
    if (FFA) {
      const report: any = await TournamentReport.findOne({
        _tournamentId: FFA,
      }).populate({ path: "_tournamentId" });

      TournamentReport.aggregate([
        { $match: { $expr: { _tournamentId: FFA } } },
        {
          $lookup: {
            from: "tournaments",
            localField: "_tournamentId",
            foreignField: "_id",
            as: "tournament",
          },
        },

        {
          $unwind: { path: "$participant", preserveNullAndEmptyArrays: false },
        },
        {
          $sort: {
            "participant.score": -1,
          },
        },
        { $unwind: "$tournament" },
      ]).exec((err, result) => {
        if (err) {
          console.error(err);
        }
        res.status(200).send(result);
      });
    } else {
      next({ name: "NO_WINNER" });
    }
    if (BRANCHES) {
    }
  }
}

export default UserController;
