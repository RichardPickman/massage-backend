import express, { json } from "express";
import cors from "cors";
import { getServerConfig } from "./config";
import router from "./routes";
import errorHandler from "./middleware/ErrorHandle/index";
import "./model/db";

const { port } = getServerConfig();
const app = express();

app.use(cors());
app.use(json());
app.use("/api", router);
app.use(errorHandler);

app.listen(port, () => console.log(`Server started on port ${port}`));
