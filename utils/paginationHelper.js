export const paginate = ({ query, cursor }) => {
  if (cursor) {
    query._id = {
      $lt: cursor,
    };
  }

  return query
};
