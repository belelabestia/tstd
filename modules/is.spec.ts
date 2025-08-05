import * as is from './is';

const a = () => {
  const ops = () => { throw ' ' };

  try {
    ops();
  }
  catch (err) {
    if (is.model(err, { message: is.$string })) {
      console.log(err.message);
    }

    const string = Schema.string();

    if (Schema.validate(string, err)) {
      console.log(err);
    }
  }
};