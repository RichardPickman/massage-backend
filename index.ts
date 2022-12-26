const cors = require("cors");
import { getServerConfig } from "./config";
import router from "./routes";
import errorHandler from "./middleware/ErrorHandle";
import logger from "./middleware/log/index";
import "./model/db";
import cookieParser from "cookie-parser";

const e = require("express");
const { port } = getServerConfig();
const app = e();

app.use(e.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "*",
    credetials: true,
  })
);
app.use(logger);
app.use("/api", router);
app.use(errorHandler);

app.listen(port, () => console.log(`Server started on port ${port}`));
