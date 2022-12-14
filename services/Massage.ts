import MassageModel from "../model/schemes/Massage";
import Grip from "./Grip";

class MassageService {
  async create(props: Record<any, any>) {
    const gripsPromises = props.items.map((gripId) => Grip.find(gripId));

    const grips = await Promise.all(gripsPromises).then((result) =>
      result.map((grip) => (grip ? grip._id : null))
    );

    const createMassage = await new MassageModel({
      title: props.title,
      items: grips,
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
      .populate("items")
      .exec();

    return massage?.toObject();
  }

  async findAll() {
    const massages = await MassageModel.find({}).populate("items").exec();

    return massages;
  }
}

const massage = new MassageService();

export default massage;
