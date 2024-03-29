namespace PD.DataLayer
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class ComptencyTitle_MaxLength : DbMigration
    {
        public override void Up()
        {
            AlterColumn("dbo.Competencies", "Name", c => c.String(nullable: false, maxLength: 160));
        }
        
        public override void Down()
        {
            AlterColumn("dbo.Competencies", "Name", c => c.String(nullable: false));
        }
    }
}
