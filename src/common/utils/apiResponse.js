export const successResponse = (message='Success', data = []) => ({
  success: true,
  message,
  data,
});

export const errorResponse = ({
  message,
  error_type = 'server_error',
  errors = [],
}) => ({
  success: false,
  error_type,
  message,
  errors,
});
