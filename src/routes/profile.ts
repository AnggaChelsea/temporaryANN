import Router from "express";
import ProfileController from "../controllers/ProfileController";
import upload from "../helper/multer";
import authentication from "../middlewares/authentication";
import authorization from "../middlewares/authorization";

const router = Router();

router.post("/profile", ProfileController.UserProfile);
router.get("/profile", authorization.user, ProfileController.seeProfile);
router.put("/profile", authorization.user, ProfileController.changeProfile);

export default router;
