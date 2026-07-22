using {cnma.carshop as db} from '../db/schema';

service CARSHOP_SRV @(path: '/api/cnma/CARSHOP_SRV') {

    // Expose API
    entity AppUser as projection on db.AppUser;
    entity Car     as projection on db.Car;
    entity Brand   as projection on db.Brand;
    entity Inquiry as projection on db.Inquiry;

    // Create Sent Event
    @description                : 'Sent when a car inquiry is created'
    @notification               : {
        template        : {
            title       : 'Car Inquiry: {{title}}',
            publicTitle : 'New Car Inquiry',
            subtitle    : '{{customerName}} submitted inquiry for {{carName}}',
            groupedTitle: 'Carshop Updates',
            email       : {
                subject: '{i18n>EMAIL_TITLE}',
                html   : './templates/inquiry-created.html'
            }
        },
        deliveryChannels: [{
            channel           : #Mail,
            enabled           : true,
            defaultPreference : true,
            editablePreference: true
        }]
    }
    @Common.SemanticObject      : 'Inquiry'
    @Common.SemanticObjectAction: 'display'
    event InquiryOrdered {
        title        : String;
        message      : String;
        description  : String;
        number       : String;
        customerName : String;
        carName      : String;
    }
}
