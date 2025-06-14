module.exports = {
  useSelector: selector => selector({}),
  useDispatch: () => () => {},
  Provider: ({ children }) => children,
  connect: () => component => component,
};
