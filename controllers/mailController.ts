import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";
import { getMailConfig } from "../config";

const { host, port, user, password } = getMailConfig();

class MailService {
  transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: true,
      auth: {
        user,
        pass: password,
      },
    });
  }

  async sendActivationLink(to: string, link: string) {
    await this.transporter.sendMail({
      from: user,
      to: to,
      subject: "Account activation for " + process.env.API_URL,
      text: "",
      html: `
        <div>
          <h1> For activation follow the link down below </h1>
          <a href="${link}">${link}</a>
        </div>
      `,
    });
  }
}

export default new MailService();
