import MassageModel from "../model/schemes/Massage";
import { Technic } from "../types";
import Grip from "./Grip";

type RequestTechnic = {
  title: string;
  grips: [string];
};

type RequestMassage = {
  title: string;
  technics: [RequestTechnic];
};

class MassageService {
  async _prepareTechnic(technic: RequestTechnic) {
    const gripsPromises = technic.grips.map((gripId) => Grip.find(gripId));

    const gripsIds = await Promise.all(gripsPromises).then((grips) =>
      grips.map((grip) => (grip ? grip._id : null))
    );

    return {
      title: technic.title,
      grips: gripsIds,
    };
  }

  async create(props: RequestMassage) {
    const technicPromises = props.technics.map((technic) =>
      this._prepareTechnic(technic)
    );

    const technics = await Promise.all(technicPromises).then(
      (result) => result
    );

    const createMassage = await new MassageModel({
      title: props.title,
      technics,
    }).save();

    const createdMassage = await this.find(createMassage.id);

    return createdMassage;
  }

  async delete(id: string) {
    const removeMassage = await MassageModel.deleteOne({ _id: id });

    return removeMassage;
  }

  async find(id: string) {
    const massage = await MassageModel.findOne({ _id: id })
      .populate({
        path: "technics",
        populate: {
          path: "grips",
        },
      })
      .exec();

    return massage?.toObject();
  }

  async findAll() {
    const massages = await MassageModel.find({})
      .populate({
        path: "technics",
        populate: {
          path: "grips",
        },
      })
      .exec();

    return massages;
  }
}

const massage = new MassageService();

export default massage;
