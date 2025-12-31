
import React from 'react';

const About: React.FC = () => {
  return (
    <div className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-bold mb-4">הסיפור שלנו</span>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">מי אנחנו?</h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-blue-600 to-teal-400 mx-auto rounded-full"></div>
        </div>

        <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-8">
          <p className="text-xl font-medium border-r-4 border-blue-600 pr-6 py-2 bg-blue-50/50">
            תכנית ה'סדנאות סביב לוח השנה היהודי' הינה תכנית שהוקמה בשנת תשס"ו (2006) על ידי עמותת 'ניידות חב"ד בע"מ' במטרה ללמד ולהקנות לילדי ישראל את ערכי חגי ישראל והמצוות המלוות אותנו במעגל השנה.
          </p>

          <p>
            התוכנית מפעילה מספר מפגשים בבתי הספר, על פני מעגל השנה, עם שימת לב ודגש לסיפור החג, ערכיו, מנהגיו ומצוותיו. 
          </p>

          <div className="grid md:grid-cols-2 gap-8 my-12">
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold mb-3">חוויה מעל הכל</h4>
              <p className="text-base text-gray-600">התוכנית מוגשת בצורה חווייתית עם צוות מדריכים שמחים ובעלי ניסיון רב שנים, ובליווי מוזיקה, מצגות ותצוגה מושקעת.</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
              <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center mb-4 text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold mb-3">חינוך יצירתי</h4>
              <p className="text-base text-gray-600">שילוב תוכן ערכי יהודי רב בשיטת ה'חינוך היצירתי', כשהמשתתפים יוצרים מוטיב משמעותי מהנושא הנלמד.</p>
            </div>
          </div>

          <p className="bg-yellow-50 p-8 rounded-2xl text-yellow-900 italic font-medium">
            "בידינו המלצות חמות ממאות לקוחות מרוצים: הורים, מורים, גננות, רכזים חברתיים ואנשי חינוך וכמובן – מאלפי ילדים מאושרים."
          </p>
          
          <div className="text-center pt-8">
            <p className="text-lg font-bold text-gray-900">נשמח לעבוד גם אתכם!</p>
            <p className="text-blue-600 font-black text-2xl mt-2">בצלאל קירנברג - רכז התוכנית</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
