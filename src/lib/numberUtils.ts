export const toEnglishNumbers = (str: string): string => {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  let result = str;
  arabicNumbers.forEach((arabicNum, index) => {
    result = result.replace(new RegExp(arabicNum, 'g'), englishNumbers[index]);
  });

  return result;
};

export const formatPhoneNumber = (phone: string): string => {
  return toEnglishNumbers(phone);
};

export const formatIDNumber = (id: string): string => {
  return toEnglishNumbers(id);
};
