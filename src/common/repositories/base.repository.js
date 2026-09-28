import prisma from '../../config/db.config.js';

export default class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  findById(id) {
    return this.model.findUnique({ where: { id } });
  }

  findFirst(where) {
    return this.model.findFirst({ where });
  }

  create(data) {
    return this.model.create({ data });
  }

  update(where, data) {
    return this.model.update({ where, data });
  }

  delete(where) {
    return this.model.delete({ where });
  }
}
