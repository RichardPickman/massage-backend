import ImageModel from "../model/schemes/Image";

class ImageService {
  async create(props: Record<any, any>) {
    const createImage = await new ImageModel(props)
      .save()
      .then((item) => this.find(item.fieldname as string));

    return createImage;
  }

  async delete(fieldname: string) {
    const removeImage = await ImageModel.deleteOne({ fieldname: fieldname });

    return removeImage;
  }

  async find(fieldname: string) {
    const image = ImageModel.findOne({ fieldname: fieldname });

    return image;
  }
}

const Image = new ImageService();

export default Image;
