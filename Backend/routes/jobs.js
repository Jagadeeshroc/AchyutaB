const express = require("express");
const router = express.Router();
const { createJob, getAllJobs, getJob,deleteJob, updateJob , applyJob } = require("../controllers/jobs");
const auth = require('../middleware/auth');

router.post("/", auth, createJob);
router.get("/", getAllJobs);
router.get('/:id', getJob);

router.delete('/:id', auth, deleteJob);
router.put('/:id', auth, updateJob);
router.post("/:id/apply", auth, applyJob);



module.exports = router;