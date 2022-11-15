import ImageModel from "../model/schemes/Image";

class ImageService {
  async create(props: Record<any, any>) {
    const createImage = await new ImageModel(props)
      .save()
      .then((item) => this.find(item.id));

    return createImage;
  }

  async delete(id: string) {
    const removeImage = await ImageModel.deleteOne({ _id: id });

    return removeImage;
  }

  async find(id: string) {
    const image = ImageModel.findOne({ _id: id });

    return image;
  }
}

const Image = new ImageService();

export default Image;
