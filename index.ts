const cors = require("cors");
import { getServerConfig } from "./config";
import router from "./routes";
import errorHandler from "./middleware/ErrorHandle/index";
import "./model/db";
const e = require("express");

const { port } = getServerConfig();
const app = e();

app.use(cors());
app.use(e.json());
app.use("/api", router);
app.use(errorHandler);

app.listen(port, () => console.log(`Server started on port ${port}`));
