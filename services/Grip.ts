import mongoose from "mongoose";
import GripModel from "../model/schemes/Grip";

class GripService {
  async create(props: Record<any, any>) {
    const createGrip = await new GripModel(props)
      .save()
      .then((item) => this.find(item._id));

    return createGrip;
  }

  async delete(id: string) {
    const removeGrip = await GripModel.deleteOne({ _id: id });

    return removeGrip;
  }

  async find(id: string | mongoose.Types.ObjectId) {
    const grip = GripModel.findOne({ _id: id });

    return grip;
  }

  async update(
    id: string | mongoose.Types.ObjectId,
    updates: Record<string, unknown>
  ) {
    const grip = await GripModel.findOneAndUpdate({ _id: id }, updates, {
      new: true,
    });

    return grip;
  }

  async findAll() {
    const grips = GripModel.find({});

    return grips;
  }
}

const Grip = new GripService();

export default Grip;
