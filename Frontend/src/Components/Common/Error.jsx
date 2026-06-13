const Error = ({ message }) => {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`
        rounded-xl
        border
        border-red-100
        bg-red-50
        p-3.5
        text-red-600
        text-xs
        font-semibold
      `}
    >
      {message}
    </div>
  );
};

export default Error;
